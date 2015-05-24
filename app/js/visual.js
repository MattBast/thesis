var fileInput = document.getElementById( "fileInput" );

var pattern = [];
var level = [];

//create table tag
var table = document.createElement("table");
document.body.appendChild( table );

//upload and print file when input changes
fileInput.addEventListener("change", upload );

function upload() {
	if( fileInput.files.length > 0 ) {

		var file = fileInput.files[0];
		console.log( "Upload", file.name );

		var reader = new FileReader();
		readFile( file, reader );

		levelOne();
	}
	else {
		alert("File is empty");
	}
}

function readFile( file, reader ) {
	reader.addEventListener("load", function() {

		var array = reader.result.split( " " );

		var row = {
			index : "",
			interestingness : "",
			entity1 : "",
			entity2 : ""
		};
		var count = -1;

		//find a row in file and fill in object with its data
		for( var i = 0; i < array.length; i++ ) {
			if( array[i].indexOf( "." ) != -1 && !isNaN( array[i] ) ) {
				/* Start of new pattern. Push current pattern
				to array and reset object */
				count++;
				row.index = count.toString();
				pattern.push( JSON.stringify( row ) );
				row.interestingness = array[i] + " ";
				row.entity1 = "";
				row.entity2 = ""; 
			}
			else if( array[i].indexOf( "twitter_id" ) != -1 ) {
				row.entity1 += array[i] + " ";
			}
			else {
				row.entity2 += array[i] + " ";
			}
		}
		drawRow( 1 );
		levelOne();

	});
	reader.readAsText( file );
}

function drawRow( rowNum ) {
	var tr = table.insertRow();
	var row = JSON.parse( pattern[rowNum] );

	var column1 = tr.insertCell();
	column1.appendChild(document.createTextNode( row.index ));
	column1.style.border = "1px solid black";

	var column2 = tr.insertCell();
	column2.appendChild(document.createTextNode( row.interestingness ));
	column2.style.border = "1px solid black";

	var column3 = tr.insertCell();
	column3.appendChild(document.createTextNode( row.entity1 ));
	column3.style.border = "1px solid black";

	var column4 = tr.insertCell();
	column4.appendChild(document.createTextNode( row.entity2 ));
	column4.style.border = "1px solid black";
}

function search() {
	clearTable();

	var index = document.getElementById( "textInput" ).value;

	for( var i = 0; i < pattern.length; i++ ) {
		var row = JSON.parse( pattern[i] ).index;
		if( row === index ) {
			drawRow( i );  //<-- add new rows as they come in
		}
	}
}

function clearTable() {
	for( var i = 0; i < table.rows.length; i++ ) {
		table.deleteRow(i);
	}
}


function levelOne() {
	var clusters = [];
	var clustered = [];

	for( var i = 1; i <= 50; i++ ) { //<-- loop through patterns
		if( clustered.contains(i.toString()) ) { continue; }
		var similar = []; //<-- an array recording how similar patterns are

		for( var j = 1; j <= 50; j++ ) { //<-- loop through patterns
			if( clustered.contains(j.toString()) ) { continue; }
			if( j !== i ) { 
				similar.push( compare( pattern[i], pattern[j] ) ); 
			}	
		}

		var largest = largestSim( similar ); //<-- find largest similarity		
		var cluster = [parseInt(JSON.parse( pattern[i] ).index), parseInt(largest)];
		clusters.push( cluster );

		clustered.push( cluster[0] );
		clustered.push( cluster[1] );
	}

	if( clustered.length == 0 ) {
		return 0;
	}
	else {
		level.push( clusters );
		newLevel( clusters );
	}

}

function compare( p1, p2 ) {
	var pattern1 = JSON.parse( p1 );
	var pattern2 = JSON.parse( p2 );
	var entities1 = pattern1.entity1.split( " " );
	var matchEnt = 0; //<-- Number of matching entities found

	for( var i = 0; i < entities1.length; i++ ) { 
		if( pattern2.entity1.indexOf( entities1[i] ) != -1 ) {
			matchEnt++;
		}
	}

	var similarity = {
		index : pattern2.index, 
		similarity : matchEnt
	};

	return similarity;
}

function largestSim( similar ) {
	var largestIndex = "";
	var largestSim = 0;
	for( var c = 0; c < similar.length; c++ ) {
		if( similar[c].similarity > largestSim ) { 
			largestIndex = similar[c].index;
			largestSim = similar[c].similarity; 
		}
	}
	
	return largestIndex;
}

function newLevel( clusters ) {
	var newClusters = [];
	var clustered = [];

	for( var i = 0; i < clusters.length; i++ ) { //<-- loop through patterns
		if( clustered.contains(clusters[i].join( "" )) ) { continue; }
		var similar = []; //<-- an array recording how similar patterns are

		for( var j = 0; j < clusters.length; j++ ) { //<-- loop through patterns
			if( clustered.contains(clusters[j].join( "" )) ) { continue; }
			if( j !== i ) { 
				similar.push( compareClus( clusters[i], clusters[j] ) ); 
			}	
		}

		var largest = largestSim( similar ); //<-- find largest similarity
		var tmpCluster = findCluster( largest, clusters );
		var newCluster = clusters[i].concat( tmpCluster );
		newClusters.push( newCluster );

		clustered.push( clusters[i].join( "" ) );
		clustered.push( tmpCluster.join( "" ) );

	}

	level.push( newClusters );

	if( clustered.length <= 10 ) {
		console.log( "Got to top of tree with " + clustered.length + " clusters" );
		plotClusters( level );
	}
	else {
		newLevel( newClusters );
	}
}

function compareClus( c1, c2 ) {
	var matchEnt = 0;
	/* loop through cluster arrays, compare all patterns 
	and add up similarity score */
	for( var i = 0; i < c1.length; i++ ) {
		for( var j = 0; j < c2.length; j++ ) {
			var tmp = compare( pattern[c1[i]], pattern[c2[j]]);
			matchEnt += tmp.similarity;
		}
	}

	var similarity = {
		index : c2.join( "" ),
		similarity : matchEnt
	};

	return similarity;
}

function findCluster( id, clusters ) {
	for( var i = 0; i < clusters.length; i++ ) {
		if( clusters[i].join( "" ) == id ) {
			return clusters[i];
		}
	}
	return [0,0];
}

function plotClusters( level ) {
	var dataset = level[level.length - 1];
	console.log( dataset );

	var w = 500;
	var h = 100;

	var svg = d3.select("body")
            	.append("svg")
            	.attr("width", w)
            	.attr("height", h);

	svg.selectAll("circle")
		.data(dataset)
		.enter()
		.append("circle")
		.attr("cx", function(d, i) {
			return (i * 50) + 25;
		})
		.attr("cy", h / 2)
		.attr("r", function(d) {
			return d.length;
		});
}

Array.prototype.contains = function(obj) {
    var i = this.length + 1;
    while (i--) {
        if (this[i] == obj) {
            return true;
        }
    }
    return false;
}

/*
*** This function is not been used. Keep code for how to use ajax ***
function sendToServer( object, file ) {
	var fileName = file.name.slice(0, (file.name.length - 4) ) + ".json";
	xmlhttp = new XMLHttpRequest();

	xmlhttp.onreadystatechange = function() {
		if( xmlhttp.readyState == 4 && xmlhttp.status == 200 ) {
			p[1].innerHTML += xmlhttp.responseText;
		}
	}

	xmlhttp.open("PUT", "http://localhost:8000/routes/" + fileName, true );
	xmlhttp.setRequestHeader("Content-Type", {"Content-Type" : "application/json"} );
	xmlhttp.send( object );
}
*/