// MQTT client for transport messages to HLK-SW16 via TCP

var mqtt = require('mqtt')
var net = require('net')

// Load configurtion from file ./config/default.json
const conf = require('config').get('configuration')

// Init mqtt and net clients
var mqtt_client  = mqtt.connect(conf.mqtt.server)
var tcp_client = new net.Socket() 

const cmndPwrTempl = [0xaa, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xbb]

// MQTT event handler CONNECT
mqtt_client.on('connect', function () {
  mqtt_client.subscribe(conf.mqtt.subCommandTopic, function (err) {
    if (!err) {
      console.log('Connected to MQTT server: ' + conf.mqtt.server
       + ' and subscribed to topic: ' + conf.mqtt.subCommandTopic)
    }
  })
})

// MQTT event handler MESSAGE
mqtt_client.on('message', function (topic, message) {
  console.log('Received message: ' + message + ' on topic: ' + topic)
  
  var stringMessage = message.toString()
  // If msg start with PWR that mean POWER command
  if (stringMessage.substr(0,3) == 'PWR') {
    var netPacket = Buffer.from(cmndPwrTempl)

    // Now get 5-th char of msg - 0 = off, 1 = on
    if (stringMessage.substr(4,1) == '0') {
      netPacket[3] = 0x02
    } else if (stringMessage.substr(4,1) == '1') {
      netPacket[3] = 0x01
    }

    // Now get 7&8-th char of msg - 00 to 15 for relay 0 to 15
    netPacket[2] = stringMessage.substr(6,2).toString(16)
    
    // Send cmnd via tcp to board
    tcp_client.write(netPacket)
  }
})

tcp_client.connect(conf.board.tcpPort, conf.board.ipAddr, function() {
    console.log('Connected to relay board: ' + conf.board.ipAddr + ' tcp' + conf.board.tcpPort
  )
})