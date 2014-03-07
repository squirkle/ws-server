var http = require('http'),
    fs = require('fs'),
    path = require('path'),
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

var WebsocketServer = function (file, publicDir, port, cbs) {
  cbs = cbs || {};
  this.file = file;
  this.publicDir = publicDir || 'public/';
  this.port = port || 8080;
  this.onConnect = cbs.onConnect || function () {};
  this.onDisconnect = cbs.onDisconnect || function () {};
  this.clients = [];
};

WebsocketServer.prototype.start = function () {
  var web = new WebServer(this.file),
      that = this;

  web.listen(this.port);

  this.io = io.listen(web);

  this.io.sockets.on('connection', function(socket){
    that.clients.push(socket);

    socket.on('connect', function (connect) {
      console.log('connect');
      that.onConnect(connect);
    });

    socket.on('disconnect', function(){
      console.log('disconnect');
      that.onDisconnect();
      that.clients.splice(that.clients.indexOf(socket), 1);
    });
  });

  eachFileInDir(this.publicDir, function (filePath) {
    that.addStatic(filePath.substring(filePath.indexOf('/')), filePath);
  });
};

WebsocketServer.prototype.addStatic = function (files) {
  if (!this.io) { throw new Exception("Must call `start` before adding static resources"); }

  var io = this.io;

  if (arguments.length === 2) {
    files = [{
      req: arguments[0],
      file: arguments[1]
    }];
  }
  files.forEach(function (file) {
    io.static.add(file['req'], file);
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

// Recursively iterate through and callback against each file in a directory.
function eachFileInDir (folderPath, cb) {
  // ignore private files
  var absPath = path.join(process.cwd(), folderPath);
  if (!fs.existsSync(absPath)) {
    console.log('ERROR: Path doesn\'t exist');
    return;
  }
  fs.readdir(absPath, function (err, files) {
    files.forEach(function (fileName) {
      if (fileName.substring(0,1) === '.') { return; }
      var fileAbsPath = path.join(absPath, fileName);
      fs.stat(fileAbsPath, function (err, stat) {
        if (stat.isDirectory()) {
          eachFileInDir(path.join(folderPath, fileName), cb);
          return;
        }
        cb(path.join(folderPath, fileName));
      });
    });
  });
}

module.exports = WebsocketServer;
