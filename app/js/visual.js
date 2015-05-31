var linkage = document.getElementsByName("linkage");

//upload and print file when input changes
var fileInput = document.getElementById( "fileInput" );
fileInput.addEventListener("change", upload );

var patterns = [];
var level = [];

//create table tag
var table = document.createElement("table");
document.body.appendChild( table );

function upload() {
	if( fileInput.files.length > 0 ) {

		var file = fileInput.files[0];
		console.log( "Upload", file.name );

		var reader = new FileReader();
		readFile( file, reader );

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
				 
				count++; //<-- End of pattern.
				row.index = count.toString();
				patterns.push( JSON.stringify( row ) );

				row.interestingness = array[i] + " "; //<-- Start of new pattern.
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
		initCluster();

	});
	reader.readAsText( file );
}

function drawRow( rowNum ) {
	var tr = table.insertRow();
	var row = JSON.parse( patterns[rowNum] );

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

	for( var i = 0; i < patterns.length; i++ ) {
		var row = JSON.parse( patterns[i] ).index;
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

function initCluster() {
	var patRef = []; //<-- pattern reference

	for( var i = 1; i <= 5; i++ ) { //<-- loop through patterns
		patRef.push( JSON.parse( patterns[i] ).index + "." );
	}

	level.push( patRef );
	var simTable = buildSimTable( patRef );
	addCluster( simTable );
}

function buildSimTable( patRef ) {
	var simTable = [];
	for( var i = 0; i < patRef.length; i++ ) { //<-- loop through patterns
		var similar = []; //<-- an array recording how similar patterns are

		for( var j = 0; j < patRef.length; j++ ) { //<-- loop through patterns
			if( j === i ) { 
				 similar.push( 0 );
			}
			else {
				similar.push( similarity( patterns[i], patterns[j] ) );
			}	
		}
		simTable.push( similar );
	}
	return simTable;
}

function addCluster( simTable ) {
	var clusters = level[level.length - 1]
	var simClus = [0,0]; //<-- similar clusters
	var largestSim = 0;
	for( var i = 0; i < simTable.length; i++ ) {
		for( var j = 0; j < simTable[i].length; j++ ) {
			if( i !== j && simTable[i][j] > largestSim ) {
				largestSim = simTable[i][j];
				simClus = [i,j];
			}
		}
	}

	var newCluster = clusters[simClus[0]] + clusters[simClus[1]];

	if( simClus[0] < simClus[1] ) {
		simClus.swap( 0, 1 );
	}
	clusters.splice( simClus[0], 1 );
	clusters.splice( simClus[1], 1 );
	clusters.push( newCluster );

	simTable = updateSimTable( simTable, simClus, newCluster );
	console.log( clusters );
	
	if( clusters.length == 1 ) {
		console.log( "Got to top of tree" );
	}
	else {
		level.push( clusters );
		addCluster( simTable );
	}
}

function updateSimTable( simTable, simClus, newCluster ) {
	if( simClus[0] < simClus[1] ) {
		simClus.swap( 0, 1 );
	}

	var similar = [];
	if( linkage[1].checked ) {
		console.log( "Complete linkage" );
		similar = complete( simClus, simTable );
	}
	else if( linkage[2].checked ) {
		console.log( "Average linkage" );
		similar = average( simClus, simTable );
	}
	else {
		console.log( "Single linkage" );
		similar = single( simClus, simTable );
	}

	//remove rows representing clustered patterns
	simTable.splice( simClus[0], 1 );
	simTable.splice( simClus[1], 1 );

	//remove columns representing clustered patterns
	for( var j = 0; j < simTable.length; j++ ) {
		simTable[j].splice( simClus[0], 1 );
		simTable[j].splice( simClus[1], 1 );
		simTable[j].push( similar[j] );
	}

	simTable.push( similar );

	return simTable;
}

function single( simClus, simTable ) {
	var similar = [];
	for( var i = 0; i < simTable[simClus[0]].length; i++ ) {
		if( simTable[simClus[1]][i] !== 0 && simTable[simClus[0]][i] > simTable[simClus[1]][i] ) {
			similar.push( simTable[simClus[0]][i] );
		}
		if( simTable[simClus[0]][i] !== 0 && simTable[simClus[1]][i] > simTable[simClus[0]][i] ) {
			similar.push( simTable[simClus[1]][i] );
		}
	}
	similar.push( 0 );
	return similar;
}

function complete( simClus, simTable ) {
	var similar = [];
	for( var i = 0; i < simTable[simClus[0]].length; i++ ) {
		if( simTable[simClus[0]][i] !== 0 && simTable[simClus[0]][i] < simTable[simClus[1]][i] ) {
			similar.push( simTable[simClus[0]][i] );
		}
		if( simTable[simClus[1]][i] !== 0 && simTable[simClus[1]][i] < simTable[simClus[0]][i] ) {
			similar.push( simTable[simClus[1]][i] );
		}
	}
	similar.push( 0 );
	return similar;
}

function average( simClus, simTable ) {
	var similar = [];
	for( var i = 0; i < simTable[simClus[0]].length; i++ ) {
		if( simTable[simClus[0]][i] !== 0 && simTable[simClus[1]][i] !== 0 ) {
			similar.push( mean( simTable[simClus[0]][i], simTable[simClus[1]][i] ) );
		}
	}
	similar.push( 0 );
	return similar;
}

function mean( num1, num2 ) {
	var total = num1 + num2;
	total = total / 2;
	return total;
}

function similarity( p1, p2 ) {
	p1 = JSON.parse( p1 );
	p2 = JSON.parse( p2 );

	var similarity = ( intersection( p1, p2 ) / union( p1, p2 ) );
	return similarity; 
}

function intersection( p1, p2 ) {
	var entities1 = p1.entity1.split( " " );
	var matchEnt = 0; //<-- Number of matching entities found

	for( var i = 0; i < entities1.length; i++ ) { 
		if( p2.entity1.indexOf( entities1[i] ) != -1 ) {
			matchEnt++;
		}
	}

	return matchEnt;
}

function union( p1, p2 ) {
	var entities1 = p1.entity1.split( " " );
	var entities2 = p2.entity2.split( " " );
	var difEnt = entities1.length + entities2.length; 

	for( var i = 0; i < entities1.length; i++ ) { 
		if( p2.entity1.indexOf( entities1[i] ) != -1 ) {
			difEnt--;
		}
	}

	return difEnt;
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

Array.prototype.max = function() {
	return Math.max.apply( Math, this );
}

Array.prototype.swap = function (x,y) {
  var tmp = this[x];
  this[x] = this[y];
  this[y] = tmp;
  return this;
}