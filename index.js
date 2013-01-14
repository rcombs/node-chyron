var events = require("events"),
	net = require("net"),
	SerialPort = require("serialport").SerialPort;

var exports = module.exports = function(ip, port, callback){
	var self = this;
	this.mode = "NET";
	if(typeof port == "object" || !port){
		this.mode = "RS232";
	}
	if(callback){
		this.on("connected", callback);
	}
	if(this.mode == "NET"){
		this.socket = new net.Socket();
		this.socket.connect(port, ip, function() {
			self.emit("connected");
		});
		this.setupEvents();
	}else if(!ip){
		SerialPort.list(function(list){
			if(!list || !list[0]){
				throw new Error("No serial ports exist!");
			}
			this.setupRS232(list[0], port);
		});
	}else{
		this.setupRS232(ip, port);
	}
};

exports.prototype = new events.EventEmitter();

exports.prototype.setupRS232 = function(port, options){
	this.socket = new SerialPort(port, options, function(){
		self.emit("connected");
	});
}

exports.prototype.setupEvents = function(){
	var self = this;
	this.socket.on("error", function(err) {
		self.emit("error", err);
	});
	this.socket.on("data", function(data) {
		self.emit("data", data);
	});
}

exports.prototype.writeRaw = function(data){
	this.socket.write(data);
}

exports.prototype.writeWithChecksum = function(command) {
	command += "\\\\";
	var checksum = 0;
	for(var i = 0; i < command.length; i++){
		checksum += command.charCodeAt(i);
	}
	this.writeRaw(command + (checksum % 256).toString(16) + "\r\n");
};

exports.prototype.disconnect = function(){
	this.client.destroy();
};

exports.prototype.writeTab = function(message, descriptor, templateDataArray, id) {
	this.writeWithChecksum((id ? ("w\\" + id) : "W") + "\\" + message + "\\" + descriptor + "\\" + templateDataArray.join("\\"));
};

exports.prototype.writeField = function(message, field, data, id) {
	this.writeWithChecksum((id ? ("u\\" + id) : "U") + "\\" + message + "\\" + field + "\\" + data);
};

exports.updateOnAirMessage = function(message, templateDataArray, buffer) {
	if (!buffer) {
		buffer = 1;
	}
	this.writeWithChecksum("V\\5\\13\\1\\" + buffer + "\\" + message + "\\1\\" + templateDataArray.join("\\"));
};