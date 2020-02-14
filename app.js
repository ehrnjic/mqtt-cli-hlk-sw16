// MQTT client for transport messages to HLK-SW16 via TCP

var mqtt = require('mqtt')
var net = require('net')

const mqtt_server = 'mqtt://test.mosquitto.org'

var mqtt_client  = mqtt.connect(mqtt_server)
var tcp_client = new net.Socket() 

const mqtt_topic = 'sw16tests'
const devTcpPort = 8080 
const devIpAddr = '192.168.1.9'

cmdOnOffTempl = [0xaa, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0b, 0xbb]

mqtt_client.on('connect', function () {
  mqtt_client.subscribe(mqtt_topic, function (err) {
    if (!err) {
      console.log('mqtt cli connected to server: ' + mqtt_server + ' and subscribed to topic: ' + mqtt_topic)
    }
  })
})
 
mqtt_client.on('message', function (mqtt_topic, message) {
    console.log('topic: ' + mqtt_topic + ' message: ' + message)
    buf = Buffer.from(cmdOnOffTempl)
    buf[2] = message[0]
    buf[3] = message[1]
    console.log(buf)
    tcp_client.write(buf)
// mqtt_client.end()
})


tcp_client.connect(devTcpPort, devIpAddr, function() {
    console.log('Connected to device: ' + devIpAddr + ' tcp' + devTcpPort)
})

// tcp_client.on('data', function(data) {
//     //var buf_in = Buffer.from(data, 'utf8')
//     console.log('Received: ' + data)
//     tcp_client.destroy(); // kill client after server's response
// })

tcp_client.on('close', function() {
	console.log('Connection closed');
});