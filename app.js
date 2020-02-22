/*

MQTT client for HLK-SW16_v3.1 relay board

This client subscribe on some topic on MQTT broker and transform 
received and implemented commands (PWR, ALL & STA) to MCU serial
communication protocol and send it to board via TCP.

*/

var mqtt = require('mqtt')
var net = require('net')

// Load configuration from file (./config/default.conf)
const conf = require('config').get('configuration')

// Define serial protocol key values 
const sndHead = 0xaa,
      sndTail = 0xbb,
      recHead = 0xcc,
      recTail = 0xdd,
      cmdChgStateOne = 0x0f,
      cmdChgStateAllOn = 0x0a,
      cmdChgStateAllOff = 0x0b,
      cmdReqStatAll = 0x1e,
      relOn = 0x01,
      relOff = 0x02

// Initialise packet (20 bytes) variable as a Buffer
var initPacket = Buffer.alloc(20, 0x00)

// Func to format send tcp packet
function initSendPacket(buf) {
    buf[0] = sndHead
    buf[19] = sndTail
    return buf
}

// Func to change state of single relay
function singleRelayChgState(state, relay) {
  var tcpPacket = initSendPacket(initPacket)
  tcpPacket[1] = cmdChgStateOne
  tcpPacket[2] = relay.toString('hex')
  if (state == '0') {
    tcpPacket[3] = relOff
  } else if (state == '1') {
    tcpPacket[3] = relOn
  }
  tcpClient.write(tcpPacket)
  console.log('Send data to board: ' + tcpPacket.toString('hex'))
}

// Func to change state of all relays
function allRelayChgState(state) {
  var tcpPacket = initSendPacket(initPacket)
  if (state == '0') {
    tcpPacket[1] = cmdChgStateAllOff
  } else if (state == '1') {
    tcpPacket[1] = cmdChgStateAllOn
  }
  tcpClient.write(tcpPacket)
  console.log('Send data to board: ' + tcpPacket.toString('hex'))
}

// Func to request state of relays on device and publish this state on mqtt topic 
function allRelayReqState() {
  var tcpPacket = initSendPacket(initPacket)
  tcpPacket[1] = cmdReqStatAll
  tcpClient.write(tcpPacket)
  console.log('Send data to board: ' + tcpPacket.toString('hex'))
}

// Init mqtt and net clients
var tcpClient = new net.Socket()
tcpClient.connect(conf.board.tcpPort, conf.board.ipAddr, function () {
    console.log('Connected to relay board: ' + conf.board.hostFqdn + ' tcp' + conf.board.tcpPort
    )
})
var mqttClient = mqtt.connect(conf.mqtt.server)

// Define event handlers

// Handle TCP event DATA
tcpClient.on('data', function (data) {
    console.log('Received data from board: ' + data.toString('hex'))
    mqttClient.publish(conf.mqtt.pubStatusTopic, data.toString('hex').substr(4,32))
        
    var checksum = 0
    for (i=1; i<18; i++) {
      checksum += data[i]
    }
    // Something is wrong with checksum (Calc chksum + 2 = Rec chksum ?????)
    console.log('Calculated checksum: ' + checksum.toString(16) + ' - Received checsum: ' 
      + data[18].toString(16))
  })

// Handle MQTT event CONNECT and topic subscription
mqttClient.on('connect', function () {
    mqttClient.subscribe(conf.mqtt.subCommandTopic, function (err) {
      if (!err) {
        console.log('Connected to MQTT broker: ' + conf.mqtt.server
          + ' and subscribed to topic: ' + conf.mqtt.subCommandTopic)
      }
    })
  })

// Handle MQTT event MESSAGE
mqttClient.on('message', function (topic, message) {
    console.log('Receive mqtt message: ' + message + ' on topic: ' + topic)

    var mqttMsg = message.toString()

    if (mqttMsg.substr(0,3) == 'PWR') {
      singleRelayChgState(mqttMsg.substr(4,1), mqttMsg.substr(6,2))
    }
    if (mqttMsg.substr(0,3) == 'ALL') {
      allRelayChgState(mqttMsg.substr(4,1))
    }
    if (mqttMsg.substr(0,3) == 'STA') {
      allRelayReqState()
    }
  })
  