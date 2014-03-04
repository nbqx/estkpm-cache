var fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    request = require('request'),
    moment = require('moment'),
    rimraf = require('rimraf'),
    level = require('level');

function EstkpmCache(dbPath){
  var self = this;
  self.dbPath = dbPath;
  return self
};

EstkpmCache.prototype.withDb = function(){
  if(_.isUndefined(this.db)) this.db = level(this.dbPath);
  return this.db
};

EstkpmCache.prototype.get = function(id,next){
  this.withDb().get(id,function(err,data){
    if(_.isUndefined(data)){
      next(null,undefined);
    }else{
      next(null,JSON.parse(data));
    }
  });
};

EstkpmCache.prototype.put = function(k,obj,next){
  this.withDb().put(k,JSON.stringify(obj),function(err){
    if(err) return next(err);
    next(null,k,obj);
  });
};

EstkpmCache.prototype.sync = function(path,next){
  var self = this;
  var json = readJSON(path);
  if(_.isNull(json)){
    console.log(path+' not found');
  }else{
    var entry = _.pairs(json);
    async.each(entry,function(o,next){
      self.getResource(o[0],o[1],function(){
        next(null);
      });
    },function(err){
      next();
    });
  }
};

EstkpmCache.prototype.list = function(done){
  var self = this;
  var res = [];
  self.withDb().createReadStream()
    .on('data',function(data){
      var itm = {};
      var obj = JSON.parse(data.value);
      res.push({key: data.key, lastModified: obj.lastModified, url: obj.url});
    })
    .on('end',function(){
      done(res);
    });
};

EstkpmCache.prototype.flush = function(){
  rimraf(this.dbPath,function(){
    console.log('.estkpm-cache flushed');
  });
};

EstkpmCache.prototype.getResource = function(name, url, next){
  var self = this;
  request.get(url,function(err,status,body){
    var sc = status.statusCode;
    var mod = status.headers['last-modified'];
    self.get(name,function(err,v){
      if(_.isNull(err) && _.isUndefined(v)){
        var data = {
          lastModified: mod,
          url: url,
          resource: body
        };
        self.put(name,data,function(err){
          if(err) return next(err);
          console.log('Added: '+name);
          next(null);
        });
      }else{
        var m = v.lastModified;
        if(moment(m).isBefore(mod)){
          var data = {
            lastModified: mod,
            url: url,
            resource: body
          };
          self.put(name,data,function(err){
            if(err) return next(err);
            console.log('Updated: '+name);
            next(null);
          });
        }else{
          next(null);
        }
      }
    });
    
  });
};

function readJSON(path){
  if(fs.existsSync(path)){
    return eval('('+fs.readFileSync(path)+')');
  }else{
    return null
  }
};

module.exports = function(path){
  var dbPath = (_.isUndefined(path))? [process.env['HOME'],'.estkpm-cache'].join('/') : path;
  var estkpm_cache = new EstkpmCache(dbPath);
  return estkpm_cache
};

