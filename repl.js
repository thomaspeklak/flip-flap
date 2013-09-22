var levelup = require("levelup");
var db = levelup("./mydb");
var Q = require("q");
var qGet = Q.denodeify(db.get.bind(db));
var repl = require("repl");
var c = repl.start({useGlobal: true}).context;
c.qGet=  qGet;
c.c = console.dir.bind(console);

