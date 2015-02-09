var mysql = require('mysql');
 
var client = mysql.createConnection({ user:'root', password:''});
client.connect();
 
client.query('use test');
client.query('create table local (area varchar(100) character set utf8, idx int) default charset = utf8',function(error, rows, fields){
    if(error) throw error; 
    else{
        console.log(rows);
    }
});
client.end();
