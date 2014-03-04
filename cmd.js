#!/usr/bin/env node
var _ = require('underscore'),
    argv = require('yargs').argv;

var db_path = undefined;
var package = [process.cwd(),'package.jsx'].join('/');
var cmd = _.first(argv._);

if(argv.d || argv.db){
  db_path = argv.d || argv.db;
}

if(argv.c || argv.config){
  package = argv.c || argv.config;
}

function errorHandler(e){
  console.log('Error: '+e);
};

function help(){
  require('fs').createReadStream(__dirname+'/usage.txt').pipe(process.stdout);
};

var estkpm_cache = require('./index')(db_path);
if(argv.h || argv.help || _.isUndefined(estkpm_cache[cmd])){
  help();
}else{
  if(cmd==='list'){
    estkpm_cache.list(function(data){
      var view = _.map(data,function(itm){
        return '- '+itm.key+": "+itm.url;
      }).join("\n");
      console.log(view);
    });
  }else if(cmd==='sync'){
    estkpm_cache.sync(package,function(err){
      if(err) return errorHandler(err);
      console.log('Sync done.');
    });
  }else if(cmd==='flush'){
    estkpm_cache.flush();
  }else{
    help();
  }
}
