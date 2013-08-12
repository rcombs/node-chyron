var events = require("events"),
	net = require("net");
	SerialPort = require("serialport");

function zeroPad(str, length){
	while(str.length < length){
		str = "0" + str;
	}
	return str;
}

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
			self.setupEvents();
		});
	}else if(!ip){
		SerialPort.list(function(nothing, list){
			if(!list || !list[0]){
				throw new Error("No serial ports exist!");
			}
			self.setupRS232(list[0].comName, port);
		});
	}else{
		this.setupRS232(ip, port);
	}
	this.queue = "";
	this.on("data", function parseChyron(data){
		if(data[0] == 0xFF){
			return;
		}
		var str = data.toString("utf8");
		this.queue += str;
		this.dequeue();
	});
};

exports.prototype = new events.EventEmitter();

exports.prototype.setupRS232 = function(port, options){
	var self = this;
	this.socket = new SerialPort.SerialPort(port, options, true);
	this.socket.on("open", function(){
		self.emit("connected");
		self.setupEvents();
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
	this.writeRaw(command + processChecksum(command) + "\r\n");
};

function processChecksum(str){
	var checksum = 0;
	for(var i = 0; i < str.length; i++){
		checksum += str.charCodeAt(i);
	}
	return zeroPad((checksum % 256).toString(16), 2);
}

exports.prototype.disconnect = function(){
	this.client.destroy();
};

exports.prototype.writeReply = function(reply){
	var command = "R\\" + reply.userId + "\\" + reply.fields.join("\\");
	this.writeWithChecksum(command);
}

exports.prototype.writeTab = function(message, descriptor, templateDataArray, id) {
	this.writeWithChecksum((id ? ("w\\" + id) : "W") + "\\" + message + "\\" + descriptor + "\\" + templateDataArray.join("\\"));
};

exports.prototype.writeField = function(message, field, data, id) {
	this.writeWithChecksum((id ? ("u\\" + id) : "U") + "\\" + message + "\\" + field + "\\" + data);
};

exports.prototype.updateOnAirMessage = function(message, templateDataArray, buffer) {
	if (!buffer) {
		buffer = 1;
	}
	this.writeWithChecksum("V\\5\\13\\1\\" + buffer + "\\" + message + "\\1\\" + templateDataArray.join("\\"));
};

exports.prototype.processCommand = function(str){
	if(str[str.length - 1] != "\\"){
		if(str.substring(str.length - 2).toLowerCase() !== processChecksum(str.substring(0, str.length - 2)).toLowerCase()){
			return; // Bad checksum; ignoring!
		}
	}
	var split = str.split("\\");
	if(split[0] == "X"){
		var request = {
			userId: split[1],
			dataMessageId: split[2],
			descriptionMessageId: split[3],
			fields: []
		};
		for(var i = 4; i < split.length; i++){
			if(split[i] == "" || split[i] == "\r\n"){
				break;
			}
			request.fields.push(split[i].substring(2));
		}
		this.emit("request", request);
	}
}

exports.prototype.dequeue = function(){
	var index = this.queue.indexOf("\r\n");
	if(index === -1){
		return;
	}
	this.processCommand(this.queue.substring(0, index));
	this.queue = this.queue.substring(index + 2);
	this.dequeue();
}
