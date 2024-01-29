const { instrument } = require('@socket.io/admin-ui')
const mongoose = require('mongoose')
const error = require('mongoose/lib/error/index.js')
const { set } = require('mongoose/lib/schemaType.js')
const userdatabaseurl =
  'mongodb+srv://idrissa:idrissa@cluster0.gyu6a4t.mongodb.net/myhandgame?retryWrites=true&w=majority'
mongoose
  .connect(userdatabaseurl)
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch(error => {
    console.error('Error connecting to MongoDB:', error.message)
  })
const PORT = process.env.PORT || 3000
const io = require('socket.io')(PORT, {
  cors: {
    origin: [
      'https://main--rockpaperscissorschat.netlify.app',
      'https://main--preeminent-pothos-3b177e.netlify.app',
      'https://admin.socket.io'
    ],
    credentials: true
  }
})
messageSchema = new mongoose.Schema(
  {
    socket_id: {
      type: String,
      require: true
    },
    room_id: {
      type: String,
      require: true
    },

    message_single: {
      type: String,
      require: true
    },
    sent_time: {
      type: String,
      require: true
    }
  },
  { timestamps: true }
)

messagemodel = mongoose.model('message', messageSchema)
messagemodel
  .deleteMany({})
  .then(result => {
    console.log(`Deleted ${result.deletedCount} documents`)
  })
  .catch(error => {
    console.error('Error deleting documents:', error)
  })

io.on('connection', socket => {
  //sending room from the server
  socket.emit('messagestoclient', [])
  const updateromclient = setInterval(() => {
    socket.volatile.emit('numroom', socket.rooms.size - 1, [...socket.rooms])
  }, 100)
  //requiring his message list from the server

  socket.on('disconnect', () => {
    console.log('Client disconnected')
    clearInterval(updateromclient)
  })
  function updateroominfo () {
    let roomsnumber = socket.rooms.size - 1
    let rooms = [...socket.rooms]
    socket.emit('numroom', roomsnumber, rooms)
    console.log(roomsnumber, rooms)
  }
  function clientexitrooms () {
    socket.rooms.forEach(room => {
      if (room !== socket.id)
        socket.leave(room, err => {
          if (err) {
            console.error(`Error leaving room ${room}: ${err}`)
          } else {
            console.log(`Left room: ${room}`)
          }
        })
    })
  }

  socket.on('setroomId', (roomid, callback) => {
    if (roomid && roomid.trim() !== '' && !/\s/.test(roomid)) {
      clientexitrooms()
      socket.join(roomid)

      if (socket.rooms.size == 2) {
        console.log(socket.rooms.size == 2)

        let roomidclient = [...socket.rooms][1]
        console.log(roomidclient)
        messagemodel
          .find({
            room_id: roomidclient
          })
          .sort({ sent_time: 1 })
          .exec()
          .then(result => {
            socket.emit('messagestoclient', result)
            console.log(result)
          })
          .catch(error => {
            console.error(error)
          })
      }
      updateroominfo()
      var istrue = true
      callback(istrue, roomid)
    } else {
      var isfalse = false
      callback(isfalse, roomid)
    }
  })

  socket.on('mymessage', (message, currenttime, roomid, callback) => {
    if (message && currenttime && socket.rooms.size === 2) {
      const socketid = socket.id
      let room = [...socket.rooms][1]
      const message_to_database = new messagemodel({
        socket_id: socketid,
        room_id: room,
        message_single: message,
        sent_time: currenttime
      })
      var istrue = true
      callback(istrue, message, currenttime, roomid)
      console.log(room)
      socket.to(room).emit('messagest', { m: message, t: currenttime })
      message_to_database
        .save()
        .then(message => console.log(message))
        .catch(error => console.log('problem', error))
    } else {
      var isfalse = false
      callback(isfalse)
    }
  })
})

console.log('Before instrument')
instrument(io, {
  auth: false,
  mode: 'development'
})

console.log('After instrument')
