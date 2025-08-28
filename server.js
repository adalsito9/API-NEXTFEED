require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
// console.log('authRoutes:', typeof authRoutes); // Debería ser 'function' (router es una función)

const { protect, authorize } = require('./middleware/authMiddleware');
// console.log('protect:', typeof protect);   // Debería ser 'function'
// console.log('authorize:', typeof authorize); // Debería ser 'function'

const apiAuth = require('./middleware/apiAuthMiddleware'); // Para la autenticación de API Key
// console.log('apiAuth:', typeof apiAuth);   // Debería ser 'function'

const cors = require('cors'); // Importa cors

const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const profileRoutes = require('./routes/profileRoutes');

const messageRoutes = require('./routes/messageRoutes');
const Message = require('./models/Message');


const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;



const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });





// Middleware para CORS
// En desarrollo, puedes permitir todo. En producción, especifica tus dominios.
app.use(cors({
  origin: '*', // Permite cualquier origen (para desarrollo) CAMBIAR CUANDO ESTE EN PRODUCCION AL CODIGO DE ABAJO
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));

// Si quieres ser más específico en producción:
/*
app.use(cors({
  origin: 'http://localhost:8000', // Ejemplo para Cordova con `cordova serve`
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
*/

// Middleware para parsear JSON en las solicitudes
app.use(express.json());

// Conexión a la base de datos
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Rutas de autenticación (públicas)
app.use('/api/auth', authRoutes);

// Ejemplo de una ruta protegida con JWT (Bearer Token)
app.get('/api/protected', protect, (req, res) => {
  res.status(200).json({
    message: `¡Bienvenido ${req.user.username}! Has accedido a una ruta protegida con JWT. Tu rol es: ${req.userRole}`,
    user: req.user
  });
});

// Ejemplo de una ruta protegida con JWT y roles (solo para admins)
app.get('/api/admin-only', protect, authorize(['admin']), (req, res) => {
  res.status(200).json({
    message: `¡Hola admin ${req.user.username}! Tienes acceso a esta ruta de administrador.`,
    user: req.user
  });
});

// Ejemplo de una ruta protegida con API Key
app.get('/api/data-by-apikey', apiAuth, (req, res) => {
  res.status(200).json({
    message: 'Has accedido a esta ruta utilizando una API Key válida.',
    data: { item1: 'dato_secreto', item2: 'otro_dato_confidencial' }
  });
});



// Manejo global de errores (500)
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(err.statusCode || 500).json({
//     message: err.message || 'Algo salió mal en el servidor.',
//     error: process.env.NODE_ENV === 'development' ? err : {} // No mostrar errores detallados en producción
//   });
// });



// AÑADIR NUEVAS RUTAS DE PUBLICACIONES Y COMENTARIOS AQUÍ
// app.use('/api/posts', postRoutes);
// app.use('/api/comments', commentRoutes);
// app.use('/api/profile', profileRoutes);




// Rutas de autenticación

app.use('/api/messages', messageRoutes);

// Rutas de publicaciones (protegidas donde sea necesario)
app.use('/api/posts', postRoutes);

// Rutas de comentarios (protegidas donde sea necesario)
app.use('/api/comments', commentRoutes);

// Rutas de perfil (protegidas)
app.use('/api/profile', protect, profileRoutes); // Toda la ruta de perfil está protegida por JWT



//WEB SOCKETS

io.use((socket, next) => {
  // Aquí puedes validar el token si quieres
  next();
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
    socket.userId = userId;
  });


  socket.on('typing', (data) => {
    // data: { to }
    io.to(data.to).emit('typing', { from: socket.userId });
});

  socket.on('private_message', async (msg) => {
    // Guarda el mensaje en la base de datos
    const newMsg = new Message({
      from: socket.userId,
      to: msg.to,
      text: msg.text
    });
    await newMsg.save();

    // Envía el mensaje en tiempo real
    io.to(msg.to).emit('private_message', { ...msg, from: socket.userId });
    io.to(socket.userId).emit('private_message', { ...msg, from: socket.userId });
  });
});



// Manejo de rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ message: `No se encontró la ruta: ${req.originalUrl}` });
});


// Manejo global de errores (500)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Algo salió mal en el servidor.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});


// // Iniciar el servidor
// app.listen(PORT, () => {
//   console.log(`Servidor ejecutándose en http://localhost:${PORT}`;

// });

server.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('API corriendo...');
});




// una forma de subir a la nube el servicio de la api