
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

// normal 
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.use("/node_modules/", express.static( __dirname + '/node_modules/'));


// Database
var mysql = require('mysql');


// restful api
app.get("/push/:word/:desc", function( req, res ){

	var client = mysql.createConnection({ user:'root', password:''});
	client.connect();

	client.query('use dicfamersbs');

	// check dup

	client.query('select count(*) as count from dic_word where word = ? and descript = ?',[ req.params.word, req.params.desc ],
		function(error, rows, fields){
		if(error){
			res.send("false");
			client.end();	
			throw error;
		} 
		else{
			if( rows[0].count == 0 ){
				// insert
				client.query('insert into dic_word values(?,?, now(), \'0\' )',
							[ req.params.word, req.params.desc ],  
					function(error, result){
						if(!error){
							console.log(result);
						}
						res.send("success");
				});
			}else{
				res.send("success");
			}
		}

		client.end();

	});

});

app.get("/pull", function( req, res ){

	var client = mysql.createConnection({ user:'root', password:''});
	client.connect();

	client.query('use dicfamersbs');

	client.query('select word, descript, DATE_FORMAT( lastupdate, \'%Y-%m-%d %T\' ) as lastupdate from dic_word where delete_flag = \'0\' order by word, lastupdate',
		function(error, rows, fields){
		if(error){
			res.send("[]");
			client.end();	
			throw error;
		} 
		else{
			var lastword = null;
			var result = [];

			for( var i = 0; i < rows.length ; ++ i ){
				if( lastword == null || rows[i].word != lastword ){
					lastword = { word:rows[i].word, descript:[] };
					result.push( lastword );
				}
				lastword.descript.push( { desc:rows[i].descript, sync:true, lastupdate:rows[i].lastupdate } );
			}
			res.json( result );
		}

		client.end();

	});
	
});


app.listen(80);