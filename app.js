// Entry-point shim.
// Some Node hosts (Hostinger / Phusion Passenger) default the startup file to "app.js".
// The real server lives in server.js — this just loads it.
require('./server.js');
