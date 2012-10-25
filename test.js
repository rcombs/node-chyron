#! /usr/bin/env node
var chyron = require("./index.js");
var readline = require("readline");
var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
rl.setPrompt("> ");

var CH = new chyron(process.argv[2], process.argv[3] || 23, function(){
	console.log("Running...");
	rl.prompt();
});

rl.on("line", function(line){
	CH.raw(line);
	rl.prompt();
});

CH.on("data", function(data){
	console.log("Incoming:" + data.toString());
	rl.prompt();
});