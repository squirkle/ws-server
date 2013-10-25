var http = require('http'),
    fs = require('fs'),
    io = require('socket.io');

var WebServer = function (file) {
  var server = function(req, res) {
    fs.readFile(file, function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading ' + file);
      }
      res.writeHead(200);
      res.end(data);
    });
  };
  return http.createServer(server);
};

var WebsocketServer = function (file, port, cbs) {
  cbs = cbs || {};
  this.file = file;
  this.port = port || 8080;
  this.onConnect = cbs.onConnect || function () {};
  this.onDisconnect = cbs.onDisconnect || function () {};
  this.clients = [];
};

WebsocketServer.prototype.start = function () {
  var web = new WebServer(this.file),
      that = this;

  web.listen(this.port);

  io.listen(web).sockets.on('connection', function(socket){
    that.clients.push(socket);

    socket.on('connect', function (connect) {
      console.log('connect');
      that.onConnect(connect);
    });

    socket.on('disconnect', function(){
      console.log('disconnect');
      that.onDisconnect();
      that.clients.remove(socket);
    });
  });
};

WebsocketServer.prototype.makeEmitter = function (eventName) {
  var that = this;
  return function (data) {
    that.clients.forEach(function (client) {
      client.emit(eventName, data);
    });
  };
};

module.exports = WebsocketServer;
