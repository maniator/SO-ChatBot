var http = require( 'http' ),
	https = require( 'https' ),
	querystring = require( 'querystring' ),
	fs = require( 'fs' );

var login = exports.login = function () {
};

var openIDLogin = (function () {
	return function () {
		var req = https.get({
			host : 'www.myopenid.com',
			path : '/signin_password'
		});

		req.on( 'response', function ( resp ) {
			cookies = resp.headers[ 'set-cookie' ].join( ';' ) + ';';

			resp.on( 'data', function ( body ) {
				body = body.toString();
				//I hate myself. I really do. If I ever kill myself, show this
				// to my family and psych(ologist|iatrist) as a suicide note
				data.tid = body.match( /name="tid" value="([^"]*)"/ )[ 1 ];
				data.token = body.match( /name="token" value="([^"]*)"/ )[ 1 ];
				data._ = body.match( /name="_" value="([^"]*)"/ )[ 1 ];

				submitCredentials();
			});
		});
	};

	function submitCredentials () {
		var queryString = querystring.stringify( data );
		console.log( queryString );
	
		var req = https.request({
			host : 'www.myopenid.com',
			path : '/signin_submit',
			method : 'POST',
			headers : {
				'Content-Type' : 'application/x-www-form-urlencoded',
				'Cookies' : cookies
			}
		});

		req.on( 'response', function ( resp ) {
			//should probably do something about saving cookies for future
			// requests. whatevah.
			linkToSO();
		});

		req.end( queryString );
	}

	function linkToSO () {
		var path = '/server?openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.return_to=http%3A%2F%2Fstackoverflow.com%2Fusers%2Fauthenticate%2F%3Fs%3D709d8420-f5c7-42b2-acd1-905774c2aaf5%26dnoa.userSuppliedIdentifier%3Dhttp%253A%252F%252Fmyopenid.com%252F&openid.realm=http%3A%2F%2Fstackoverflow.com%2Fusers%2Fauthenticate%2F&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.alias3=http%3A%2F%2Fopenid.net%2Fsrv%2Fax%2F1.0&openid.alias3.if_available=alias1%2Calias2%2Calias3%2Calias4&openid.alias3.mode=fetch_request&openid.alias3.type.alias1=http%3A%2F%2Fschema.openid.net%2FnamePerson&openid.alias3.count.alias1=1&openid.alias3.type.alias2=http%3A%2F%2Fschema.openid.net%2Fcontact%2Femail&openid.alias3.count.alias2=1&openid.alias3.type.alias3=http%3A%2F%2Faxschema.org%2FnamePerson&openid.alias3.count.alias3=1&openid.alias3.type.alias4=http%3A%2F%2Faxschema.org%2Fcontact%2Femail&openid.alias3.count.alias4=1';

		var req = https.get({
			host : 'www.myopenid.com',
			path : path,
			headers : {
				'Cookies' : cookies
			}
		});

		req.on( 'response', function ( resp ) {
			var opts = require( 'url' ).parse( resp.headers.location );
			console.log( opts );
			//loginToSO( resp.headers.location );

			var req1 = https.get({
				host : opts.host,
				path : opts.path
			});
			req1.on( 'response', function ( resp1 ) {
				console.log( resp1 );
				resp1.on( 'data', function ( body ) {
					console.log( body );
				});
			});
		});
	}

	function loginToSO ( url ) {
		console.log( require('url').parse(url).host );
		var req = http.get({
			host : 'stackoverflow.com'
		});

		req.on( 'response', function ( resp ) {
			console.log( resp.headers );

			fs.unlink( 'resp.txt' );
			var file = fs.createWriteStream( 'resp.txt', {
				'flags' : 'a'
			});
			
			resp.on( 'data', function ( body ) {
				file.write( body );
				console.log( 'DONE' );
			});
		});
	}
}());

var req = http.get({
	host : 'chat.stackoverflow.com',
	path : '/rooms/17/javascript',
	headers : {}
});

req.on( 'response', function ( resp ) {
	console.log( resp.headers );
	resp.on( 'data', function ( body ) {
		console.log( body.toString() );
	});
});
