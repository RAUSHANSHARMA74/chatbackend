const express = require('express');
// const  {chatRouter} = require("./routerFile")
const cors = require('cors');
const {connection} = require("./config/connection")
require("dotenv").config()
const {chatmodel} = require("./model/chat.model")

const app = express();

// init socket server
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// middleware
// Include process module
// const process = require('process');
 
// Printing current directory
// console.log("Current working directory: ",process.cwd());
// const path  = require("path")
// app.use(express.static('frontend'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());
// app.use(chatRouter)

// app homepage
// app.get('/', (req, res) => {
//   // res.sendFile(__dirname + "../frontend/index");
//   res.sendFile( path.join( __dirname, '../frontend', 'index.html' ));
// });

// session post page
const { v4: uuidv4 } = require('uuid');
app.post('/session', (req, res) => {
  let data = {
    username: req.body.username,
    userID: uuidv4()
  }
  res.send(data);
});

// socket.io middleware
io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  const userID = socket.handshake.auth.userID;
  if(!username) {
    return next(new Error('Invalid username'));
  }
  // create new session
  socket.username = username;
  socket.id = userID;
  next();
});

// socket events
let users = [];
io.on('connection', async socket => {

  // socket methods
  const methods = {
    getToken: (sender, receiver) => {
      let key = [sender, receiver].sort().join("_");
      return key;
    },
    fetchMessages: async (sender, receiver) => {
      let token = methods.getToken(sender, receiver);
      const findToken = await chatmodel.findOne({userToken: token});
      if(findToken) {
        io.to(sender).emit('stored-messages', {messages: findToken.messages});
      } else {
        let data = {
          userToken: token,
          messages: []
        }
        const saveToken = new chatmodel(data);
        const createToken = await saveToken.save();
        if(createToken) {
          console.log('Token created!');
        } else {
          console.log('Error in creating token');
        }
      }
    },
    saveMessages : async ({from, to, message, time}) => {
      let token = methods.getToken(from, to);
      let data = {
        from,
        message,
        time
      }
      chatmodel.updateOne({userToken: token}, {
        $push: {messages: data}
      }, (err, res) => {
        if (err) throw err;
        console.log('Message saved!', res);
      });
    }
  }

  // get all users
  let userData = {
    username : socket.username,
    userID : socket.id
  }
  users.push(userData);
  io.emit('users', {users});

  socket.on('disconnect', () => {
    users = users.filter( user => user.userID !== socket.id);
    io.emit('users', {users} );
    io.emit('user-away', socket.id);
  });

  // get message from client
  socket.on('message-to-server', payload => {
    io.to(payload.to).emit('message-to-user', payload);
    methods.saveMessages(payload);
  });

  // fetch previous messages
  socket.on('fetch-messages', ({receiver}) => {
    methods.fetchMessages(socket.id, receiver);
  });

});


//-------------------------------------
let port = process.env.port || 3000
server.listen(port, async () => {
  try {
    await connection
    console.log("connected to db")
  } catch (error) {
    console.log("wrong in port")
  }
  console.log(`Server is running on port ${port}`);
});