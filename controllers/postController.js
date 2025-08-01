const Post = require('../models/Post');
const Comment = require('../models/Comment'); // Para eliminar comentarios asociados

// @desc    Obtener todas las publicaciones (con filtros, paginación, etc.)
// @route   GET /api/posts
// @access  Public
exports.getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query; // Paginación y búsqueda
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } }, // Búsqueda insensible a mayúsculas/minúsculas
          { content: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 }) // Ordenar por las más recientes
      .skip(skip)
      .limit(parseInt(limit));

    const totalPosts = await Post.countDocuments(query);

    res.status(200).json({
      message: 'Publicaciones obtenidas exitosamente',
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      posts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor al obtener publicaciones.' });
  }
};

// @desc    Obtener una publicación por ID
// @route   GET /api/posts/:id
// @access  Public
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada.' });
    }
    res.status(200).json({ message: 'Publicación obtenida exitosamente', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor al obtener la publicación.' });
  }
};

// @desc    Crear una nueva publicación
// @route   POST /api/posts
// @access  Private (Necesita JWT)
exports.createPost = async (req, res) => {
  const { title, content, imageUrl } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Título y contenido son obligatorios.' });
  }

  try {
    const newPost = await Post.create({
      title,
      content,
      imageUrl,
      user: req.user._id, // Viene del middleware 'protect'
      username: req.user.username // Viene del middleware 'protect'
    });
    res.status(201).json({ message: 'Publicación creada exitosamente', post: newPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor al crear la publicación.' });
  }
};

// @desc    Actualizar una publicación
// @route   PUT /api/posts/:id
// @access  Private (Solo el propietario o un admin)
exports.updatePost = async (req, res) => {
  const { title, content, imageUrl } = req.body;

  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada.' });
    }

    // Verificar si el usuario es el propietario o un admin
    if (post.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para actualizar esta publicación.' });
    }

    post.title = title || post.title;
    post.content = content || post.content;
    post.imageUrl = imageUrl || post.imageUrl;

    const updatedPost = await post.save();
    res.status(200).json({ message: 'Publicación actualizada exitosamente', post: updatedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor al actualizar la publicación.' });
  }
};

// @desc    Eliminar una publicación
// @route   DELETE /api/posts/:id
// @access  Private (Solo el propietario o un admin)
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada.' });
    }

    // Verificar si el usuario es el propietario o un admin
    if (post.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para eliminar esta publicación.' });
    }

    await post.deleteOne(); // Usa deleteOne() o deleteMany() en Mongoose 6+

    // Eliminar todos los comentarios asociados a esta publicación
    await Comment.deleteMany({ post: req.params.id });

    res.status(200).json({ message: 'Publicación eliminada exitosamente y sus comentarios asociados.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor al eliminar la publicación.' });
  }
};