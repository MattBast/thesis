var linkage = document.getElementsByName("linkage");

//upload and print file when input changes
var fileInput = document.getElementById( "fileInput" );
fileInput.addEventListener("change", loadSpin );
fileInput.addEventListener("change", upload );

//loading spinner
var degrees = 0;
var interval;

var patterns = [];
var clusRef = new Map(); //<-- references the parents of a cluster

//each element represents a level in the hierarchical clustering
var level = []; 

//lists of entities and indexs
var entity = new Map();

//create table tag
var table = document.createElement("table");
var frequency1 = [];
var frequency2 = [];
var frequency3 = [];
var total = [];

//table search bar
var box = document.getElementById( "searchBar" );
var returnButton = document.createElement( "button" );

//for timing the program
var d = new Date();

function upload() {
	console.log( d.getMinutes() + " " + d.getSeconds() );
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

		var map = new Map();

		var count = 1;

		//find a pattern in file. Store each entity as a key, value
		for( var i = 0; i < array.length; i++ ) {
			if( array[i].indexOf( "." ) != -1 && !isNaN( array[i] ) ) { 
				var pat = new Map(); //<-- pattern
				pat.set( 0, array[i] ); //<-- interestingness
				patterns.push( pat );

			}
			if( array[i].indexOf( "." ) != -1 && isNaN( array[i] ) ) {
				if( !map.has( array[i] ) ) {
					map.set( array[i], count );
					pat.set( count, array[i] );
					count++;
				}
				else {
					pat.set( map.get( array[i] ), array[i] );
				}
			}
		}
		keyValueSwap( map );
		console.log( "Finished reading" );
		patterns = sparseMatrix();
		main();

	});
	reader.readAsText( file );
}

function keyValueSwap( map ) {
	var count = 0;
	for( var key of map.keys() ) {
		entity.set( count, key );
		count++;
	}
}

function sparseMatrix() {
	var newPats = new Map(); //<-- new patterns

	for( var i = 0; i < patterns.length; i++ ) {
		var e = []; //<-- new array of entities in pattern
		for( var key of entity.keys() ) {
			if( patterns[i].has(key) ) {
				e.push(1);
			}
			else {
				e.push(0);
			}
		}
		newPats.set( i, e );
	}

	return newPats;
}

function main() {
	var clusters = initClusters();
	console.log( "Completed initial clustering" );
	var simTable = buildSimTable();
	console.log( "Finished building simTable" );
	for( var key of simTable[0].keys() ) {
		console.log( key );
	}
	for( var value of simTable[0].values() ) {
		console.log( value );
	}

	for( var key of simTable[4].keys() ) {
		console.log( key );
	}
	for( var value of simTable[4].values() ) {
		console.log( value );
	}
	d = new Date();
	console.log( d.getMinutes() + " " + d.getSeconds() );
	
	//keep clustering the patterns until there are only three clusters
	/*
	while( simTable.length > 3 ) {
		simTable = addCluster( simTable );
	}
	*/
	console.log( "Got to top of tree" );
	stopSpin();
	//visualise( level );
	//frequencyTable();
	
}

function initClusters() {
	var clusters = []; //<-- pattern reference
	var parents = [];
	for( var i = 1; i < patterns.size; i++ ) { //<-- loop through patterns
		clusters.push( i.toString() );
		clusRef.set( i.toString(), parents );
	}

	level.push( clusters );
	return clusters;
}

function buildSimTable() {
	var simTable = [];
	for( var i = 0; i < 10; i++ ) { //<-- loop through patterns
		var similar = new Map(); //<-- records how similar patterns are

		for( var j = i; j < 10; j++ ) { //<-- loop through patterns
			if( j === i ) { 
				similar.set( i.toString() + "+" + j.toString() ,0 );
			}
			else {
				similar.set( i.toString() + "+" + j.toString() ,
					similarity( patterns.get(i), patterns.get(j) ) );
			}	
		}
		simTable.push( similar );
	}
	return simTable;
}

function similarity( p1, p2 ) {
	var matchEnt = 0; //<-- intersection
	var difEnt = 0; //<-- union

	for( var i = 0; i < p1.length; i++ ) {
		if( p1[i] === 1 && p2[i] === 1 ) {
			matchEnt++;
			difEnt--;
		}
		if( p1[i] === 1 ) {
			difEnt++;
		}
		if( p2[i] === 1 ) {
			difEnt++;
		}
	}

	var similarity = matchEnt / difEnt;
	return similarity;
}

function addCluster( simTable ) {
	var clusters = level[level.length - 1];
	var simClus = [0,0]; //<-- similar clusters
	var largestSim = 0;

	//find two most similar clusters in simTable
	for( var i = 0; i < simTable.length; i++ ) {
		for( var [key, value] of simTable[0].values() ) {
			if( value > largestSim ) {
				largestSim = value;
				simClus = key.split( "+" );
			}
		}
	}

	//new cluster and its parents
	var newCluster = simClus[0] + "." + simClus[1];
	clusRef.set( newCluster, simClus );
	console.log( clusRef.get(newCluster) );
	
	//update record of what clusters are on each level
	if( parseInt( simClus[0] ) < parseInt( simClus[1] ) ) {
		simClus.swap( 0, 1 );
	}
	clusters.splice( parseInt( simClus[0] ), 1 );
	clusters.splice( parseInt( simClus[1] ), 1 );
	clusters.push( newCluster );
	
	simTable = updateSimTable( simTable, simClus, newCluster );
	level.push( clusters );
	
	return simTable;
}

function updateSimTable( simTable, simClus, newCluster ) {
	if( parseInt( simClus[0] ) < parseInt( simClus[1] ) ) {
		simClus.swap( 0, 1 );
	}

	var similar = [];
	if( linkage[1].checked ) {
		similar = complete( simClus, simTable );
	}
	else if( linkage[2].checked ) {
		similar = average( simClus, simTable );
	}
	else {
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

function loadSpin() {
	console.log( "Started spinning" );
	document.getElementById("spinner").style.display = "block";
	interval = setInterval(spin, 50);
}

function spin() {
	if( degrees === 360 ) {
		degrees = 10;
	}
	else {
		degrees += 10;
	}
	
	var ctx = document.getElementById("spinner").getContext("2d");

	ctx.save();
	ctx.clearRect(0, 0, 500, 500);
	ctx.translate(250, 250); //<-- move to centre of canvas

	ctx.beginPath();
	ctx.lineWidth = 10;
	ctx.strokeStyle = "black";
	ctx.rotate(degrees*Math.PI/180);
	ctx.translate(-250, -250); //<-- put it back
	ctx.arc(250,250,50,0,1.5*Math.PI);
	ctx.stroke();
	ctx.restore();
}

function stopSpin() {
	clearInterval(interval);
	document.getElementById("spinner").style.display = "none";
}

function visualise( level ) {
	var clusters = level[level.length - 1];
	var dataset = [];
	for( var i = 0; i < clusters.length; i++ ) {
		dataset.push( clusters[i].split( " ", clusters[i].length - 1 ) );
	}

	var largestClus = 0;
	for( var j = 0; j < dataset.length; j++ ) {
		if( dataset[j].length > largestClus ) {
			largestClus = dataset[j].length;
		}
	}
	
	var w = 500;
	var h = 500;
	var padding = 20;

	var xScale = d3.scale.linear()
				.domain([ 0, w ])
				.range([padding, w - padding * 2]);

	var yScale = d3.scale.linear()
				.domain([ 0, h ])
				.range([0, 2]);

	var rScale = d3.scale.linear()
				.domain([ 0, largestClus ])
				.range([padding,dataset.length - padding]);

	var svg = d3.select("#visual")
				.append("svg")
				.attr("width", w)
				.attr("height", h)
				.attr("id", "clusterVis");
	/*
	svg.append("line")
		.attr("x1", w - padding)
		.attr("y1", 0 + padding)
		.attr("x2", w - padding)
		.attr("y2", h - padding)
		.attr("stroke-width", 2)
		.attr("stroke", "black");
	*/
	svg.selectAll("circle")
		.data(dataset)
		.enter()
		.append("circle")
		.attr("cx", function(d, i) {
			return xScale(i * (w / dataset.length) );
		})
		.attr("cy", function(d, i) {
			return h / 2;
		})
		.attr("r", function(d) {
			return (d.length) * 10;
		})
		.on("mouseover", function(d, i) {
			var yPos = parseFloat(d3.select("svg").attr("y"));
			var frequencyArray = [];
			if( i === 0 ) { frequencyArray = frequency1; }
			else if( i === 1 ) { frequencyArray = frequency2; }
			else { frequencyArray = frequency3; }

			d3.select("#tooltip")
				.style("left", 0)
				.style("top", yPos + "px")
				.select("#value")
				.text( frequencyArray[0].pattern + " " + frequencyArray[0].frequency + " " +
				frequencyArray[1].pattern + " " + frequencyArray[1].frequency + " " +
				frequencyArray[2].pattern + " " + frequencyArray[2].frequency );

			d3.select("#tooltip").classed("hidden", false);
		})
		.on("mouseout", function() {
			d3.select("#tooltip").classed("hidden", true);
		});
}

function frequencyTable() {
	var c = level[level.length - 1];
	frequency1 = frequencyArray( c[0] );
	frequency2 = frequencyArray( c[1] );
	frequency3 = frequencyArray( c[2] );

	total = combine( frequency1, frequency2 );
	total = combine( total, frequency3 );

	createTableHead();

	for( var i = 0; i < 10; i++ ) {
		var tr = table.insertRow();

		var column1 = tr.insertCell();
		column1.appendChild(document.createTextNode( total[i].pattern ));
		column1.style.border = "1px solid black";

		var column2 = tr.insertCell();
		column2.appendChild(document.createTextNode( total[i].frequency ));
		column2.style.border = "1px solid black";

		tr.addEventListener( "click", clickRow );
	}
	document.body.appendChild( table );
}

function topTenButton() {
	returnButton.addEventListener( "click", originalTable );
	t = document.createTextNode( "Top 10" );
	returnButton.appendChild( t );
	box.appendChild( returnButton );
}

function originalTable() {
	box.removeChild( returnButton );
	clearTable();

	for( var i = 0; i < 10; i++ ) {
		var tr = table.insertRow();

		var column1 = tr.insertCell();
		column1.appendChild(document.createTextNode( total[i].pattern ));
		column1.style.border = "1px solid black";

		var column2 = tr.insertCell();
		column2.appendChild(document.createTextNode( total[i].frequency ));
		column2.style.border = "1px solid black";

		tr.addEventListener( "click", clickRow );
	}
	document.body.appendChild( table );
}

function createTableHead() {
	var header = table.createTHead();
	var row = header.insertRow(0);
	var head1 = row.insertCell(0);
	var head2 = row.insertCell(1);
	head1.innerHTML = "<b>Entity name</b>";
	head2.innerHTML = "<b>Frequency</b>";
}

function search() {
	topTenButton();
	clearTable();
	table = document.createElement("table");
	createTableHead();

	var entity = document.getElementById( "textInput" ).value;

	for( var i = 0; i < total.length; i++ ) {
		var row = total[i].pattern;
		if( row.indexOf( entity ) != -1 ) {
			var tr = table.insertRow();

			var column1 = tr.insertCell();
			column1.appendChild(document.createTextNode( total[i].pattern ));
			column1.style.border = "1px solid black";

			var column2 = tr.insertCell();
			column2.appendChild(document.createTextNode( total[i].frequency ));
			column2.style.border = "1px solid black";

			tr.addEventListener( "click", clickRow );
		}
	}
	document.body.appendChild( table );
}

function clearTable() {
	document.body.removeChild( table );
}

function clickRow() {
	//clear the colour of all rows
	var rows = table.rows;
	for( var i = 0; i < rows.length; i++ ) {
		rows[i].style.backgroundColor = "";
	}

	//change colour of the selected row
	this.style.backgroundColor = "#98bf21";

	var ef1 = findFrequency( frequency1, this.cells[0].innerHTML );
	var ef2 = findFrequency( frequency2, this.cells[0].innerHTML );
	var ef3 = findFrequency( frequency3, this.cells[0].innerHTML );
			
	//convert ratio to percentage
	ef1 = Math.round( (ef1 * 100) / parseInt( this.cells[1].innerHTML ) );
	ef2 = Math.round( (ef2 * 100) / parseInt( this.cells[1].innerHTML ) );
	ef3 = Math.round( (ef3 * 100) / parseInt( this.cells[1].innerHTML ) );

	reVisualise( ef1, ef2, ef3 );
}

function frequencyArray( cluster ) {
	patternRefs = cluster.split( ".", cluster.length - 1 );
	clusPats = ""; //<--cluster patterns
	for( var i = 0; i < patternRefs.length; i++ ) {
		if( patternRefs[i] !== "" ) {
			clusPats += JSON.parse( patterns[parseInt( patternRefs[i] )] ).entity1;
		}
	}

	var entities = clusPats.split( " " );
	var frequencyCount = [];
	while( entities.length !== 0 ) {

		var patFrequency = {
			pattern : entities[0],
			frequency : 1
		};
		for( var j = 1; j < entities.length; j++ ) {
			if( entities[j] === entities[0] ) {
				patFrequency.frequency++;
				entities.splice( j, 1 );
				j--;
			}
		}
		entities.splice( 0, 1 );
		frequencyCount.push( patFrequency );
	}
	return frequencyCount;
}

function combine( f1, f2 ) {
	var total = [];

	for( var i = 0; i < f1.length; i++ ) {
		var shared = false;
		var patFrequency = {
			pattern : f1[i].pattern,
			frequency : f1[i].frequency
		};
		for( var j = 0; j < f2.length; j++ ) {
			if( f2[j].pattern === f1[i].pattern ) {
				shared = true;
				patFrequency.frequency += f2[j].frequency;
				total.push( patFrequency );
			}
		}
		if( !shared ) { total.push( patFrequency ); }
	}

	for( var c = 0; c < f2.length; c++ ) {
		var shared = false;
		for( var d = 0; d < total.length; d++ ) {
			if( total[d].pattern === f2[c].pattern ) {
				shared = true;
			}
		}
		if( !shared ) { total.push( f2[c] ); }
	}
	return total;
}

function findFrequency( cluster, entity ) {
	for( var i = 0; i < cluster.length; i++ ) {
		if( cluster[i].pattern === entity ) {
			return cluster[i].frequency;
		}
	} 
	return 0;
}

function reVisualise( ef1, ef2, ef3 ) {
	//remove previous visual
	var visual = document.getElementById( "visual" );
	var clusterVis = document.getElementById( "clusterVis" );
	visual.removeChild( clusterVis );

	var clusters = level[level.length - 1];
	var dataset = [];
	for( var i = 0; i < clusters.length; i++ ) {
		dataset.push( clusters[i].split( ".", clusters[i].length - 1 ) );
	}

	var largestClus = 0;
	for( var j = 0; j < dataset.length; j++ ) {
		if( dataset[j].length > largestClus ) {
			largestClus = dataset[j].length;
		}
	}
	
	var w = 500;
	var h = 500;
	var padding = 20;

	var xScale = d3.scale.linear()
				.domain([ 0, w ])
				.range([padding, w - padding * 2]);

	var yScale = d3.scale.linear()
				.domain([ 0, h ])
				.range([0, 2]);

	var rScale = d3.scale.linear()
				.domain([ 0, largestClus ])
				.range([padding,dataset.length - padding]);

	var colourScale = d3.scale.linear()
						.domain([ 0, 100 ])
						.range([ 0, 255 ]);

	var svg = d3.select("#visual")
				.append("svg")
				.attr("width", w)
				.attr("height", h)
				.attr("id", "clusterVis");
	/*
	svg.append("line")
		.attr("x1", w - padding)
		.attr("y1", 0 + padding)
		.attr("x2", w - padding)
		.attr("y2", h - padding)
		.attr("stroke-width", 2)
		.attr("stroke", "black");
	*/
	svg.selectAll("circle")
		.data(dataset)
		.enter()
		.append("circle")
		.attr("cx", function(d, i) {
			return xScale(i * (w / dataset.length) );
		})
		.attr("cy", function(d, i) {
			return h / 2;
		})
		.attr("r", function(d) {
			return (d.length) * 10;
		})
		.style("fill", function(d,i) {
			if( i === 0 ) { return d3.rgb( colourScale(ef1), 0, 0 ); }
			else if( i === 1 ) { return d3.rgb( colourScale(ef2), 0, 0 ); }
			else { return d3.rgb( colourScale(ef3), 0, 0 ); }
		})
		.on("mouseover", function(d, i) {
			var yPos = parseFloat(d3.select("svg").attr("y"));
			var frequencyArray = [];
			if( i === 0 ) { frequencyArray = frequency1; }
			else if( i === 1 ) { frequencyArray = frequency2; }
			else { frequencyArray = frequency3; }

			d3.select("#tooltip")
				.style("left", 0)
				.style("top", yPos + "px")
				.select("#value")
				.text( frequencyArray[0].pattern + " " + frequencyArray[0].frequency + " " +
				frequencyArray[1].pattern + " " + frequencyArray[1].frequency + " " +
				frequencyArray[2].pattern + " " + frequencyArray[2].frequency );

			d3.select("#tooltip").classed("hidden", false);
		})
		.on("mouseout", function() {
			d3.select("#tooltip").classed("hidden", true);
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

Array.prototype.max = function() {
	return Math.max.apply( Math, this );
}

Array.prototype.swap = function (x,y) {
  var tmp = this[x];
  this[x] = this[y];
  this[y] = tmp;
  return this;
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
