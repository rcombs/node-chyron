var events = require("events"),
	net = require("net");

var exports = module.exports = function(ip, port, callback){
	var self = this;
	var client = this.client = new net.Socket();
	client.on("error", function(err) {
		self.emit("error", err);
	});
	client.on("data", function(data) {
		self.emit("data", data);
	});
	client.connect(port, ip, function() {
		self.emit("connected");
	});
};

exports.prototype = new events.EventEmitter();

exports.prototype.raw = function(command) {
	command += "\\\\";
	var checksum = 0;
	for(var i = 0; i < command.length; i++){
		checksum += command.charCodeAt(i);
	}
	this.client.write(command + (checksum % 256).toString(16) + "\r\n");
};

exports.prototype.disconnect = function(){
	this.client.destroy();
};

exports.prototype.writeTab = function(message, descriptor, templateDataArray, id) {
	this.raw((id ? ("w\\" + id) : "W") + "\\" + message + "\\" + descriptor + "\\" + templateDataArray.join("\\"));
};

exports.prototype.writeField = function(message, field, data, id) {
	this.raw((id ? ("u\\" + id) : "U") + "\\" + message + "\\" + field + "\\" + data);
};

exports.updateOnAirMessage = function(message, templateDataArray, buffer) {
	if (!buffer) {
		buffer = 1;
	}
	return raw("V\\5\\13\\1\\" + buffer + "\\" + message + "\\1\\" + templateDataArray.join("\\"));
};