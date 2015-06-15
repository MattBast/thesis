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
var priorityQueue = []; //<-- orders patterns/clusters by similarity

//each element represents a level in the hierarchical clustering
var level = [];
var dataset = []; 

//lists of entities and indexs
var entity = new Map();

//displays how high up the tree the user is
var patternsPresent = document.getElementById( "patternsPresent" );

//create table tag
var table = document.createElement("table");
var frequency1 = [];
var frequency2 = [];
var frequency3 = [];
var frequency4 = [];
var total = new Map();

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
	initClusters();
	console.log( "Completed initial clustering" );
	var simTable = buildSimTable();
	console.log( "Finished building simTable" );

	//keep clustering the patterns until there are only three clusters
	while( level[level.length - 1].length > 4 ) {
		simTable = addCluster( simTable );
	}

	console.log( "Got to top of tree" );
	stopSpin();
	visualise( simTable );

	createTableHead();
	frequencyTable( level[level.length - 1] );
	d = new Date();
	console.log( d.getMinutes() + " " + d.getSeconds() );
}

function initClusters() { 
	var clusters = [];
	var parents = [];
	for( var i = 1; i < 21; i++ ) { 
		clusters.push( i.toString() );
		clusRef.set( i.toString(), parents );
	}
	level.push( clusters );
}

function buildSimTable() {
	var simTable = new Map(); //<-- records how similar patterns are
	for( var i = 0; i < 20; i++ ) { 
		for( var j = i; j < 20; j++ ) { 
			var iKey = (i + 1).toString();
			var jKey = (j + 1).toString();
			if( j === i ) { 
				simTable.set( iKey + "+" + jKey, 0 );
				priorityQueue.push( iKey + "+" + jKey );
			}
			else {
				simTable.set( iKey + "+" + jKey,
					similarity( patterns.get(i), patterns.get(j) ) );
				priorityQueue = addToQueue( priorityQueue, simTable,
					iKey + "+" + jKey );
			}	
		}
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

function addToQueue( queue, simTable, newSim ) {
	for( var i = 0; i < queue.length; i++ ) {
		if( simTable.get( newSim ) > simTable.get( queue[i] ) ) {
			queue.splice( i, 0, newSim );
			return queue;
		}
	}
	queue.push( newSim );
	return queue;
}

function addCluster( simTable ) {
	var clusters = level[level.length - 1];
	var simClus = priorityQueue[0].split( "+" );
	simTable.delete( simClus[0] + "+" + simClus[1] );

	//new cluster and its parents
	var newCluster = simClus[0] + "-" + simClus[1];
	clusRef.set( newCluster, simClus );

	clusters= updateClusters( clusters, simClus );
	clusters.push( newCluster );
	
	simTable = updateSimTable( simTable, simClus, clusters );
	
	return simTable;
}

function updateClusters( clusters, simClus ) {
	for( var i = 0; i < clusters.length; i++ ) {
		if( clusters[i] === simClus[0] || clusters[i] === simClus[1] ) {
			clusters.splice( i, 1 );
			i--;
		}
	}
	return clusters;
}

function updateSimTable( simTable, simClus, clusters ) {
	var tmp1 = [];
	var tmp2 = [];

	simTable = removeSamePats( simTable, simClus );

	for( var j = 0; j < clusters.length; j++ ) {
		var object = {
			key : "",
			value : 0
		};
		if( simTable.has( clusters[j] + "+" + simClus[0] ) ) {
			object.key = clusters[j] + "+" + simClus[0];
			object.value = simTable.get( object.key );
			tmp1.push( object );
			simTable.delete( object.key );
		}
		if( simTable.has( simClus[0] + "+" +  clusters[j] ) ) {
			object.key = simClus[0] + "+" +  clusters[j];
			object.value = simTable.get( object.key );
			tmp1.push( object );
			simTable.delete( object.key );
		}
		if( simTable.has( clusters[j] + "+" + simClus[1] ) ) {
			object.key = clusters[j] + "+" + simClus[1];
			object.value = simTable.get( object.key );
			tmp2.push( object );
			simTable.delete( object.key );
		}
		if( simTable.has( simClus[1] + "+" +  clusters[j] ) ) {
			object.key = simClus[1] + "+" +  clusters[j];
			object.value = simTable.get( object.key );
			tmp2.push( object );
			simTable.delete( object.key );
		}
	}

	var newClusSims = compareNewClus( simClus, tmp1, tmp2 );
	simTable = updateTableAndQueue( simTable, newClusSims );
	
	level.push( clusters );
	return simTable;
}

function removeSamePats( simTable, simClus ) {
	//remove comparisons where a pattern is compared to itself
	if( simTable.has( simClus[0] + "+" +  simClus[0] ) ) {
		simTable.delete( simClus[0] + "+" +  simClus[0] );
	}
	if( simTable.has( simClus[1] + "+" +  simClus[1] ) ) {
		simTable.delete( simClus[1] + "+" +  simClus[1] );
	}

	return simTable;
}

function compareNewClus( simClus, tmp1, tmp2 ) {
	var newClusSims = new Map();
	var best = 0;
	for( var i = 0; i < tmp1.length; i++ ) {
		var clus = tmp1[i].key.split( "+" );
		var ref = "";
		if( clus[0] !== simClus[0] && clus[0] !== simClus[1] ) {
			ref = clus[0];
		}
		else {
			ref = clus[1];
		}

		var newKey = ref + "+" + simClus[0] + "-" + simClus[1];
		best = mostSimilar( tmp1[i].value, tmp2[i].value );
		newClusSims.set( newKey, best );
	}
	return newClusSims;
}

function mostSimilar( num1, num2 ) {
	var best = 0;

	if( linkage[1].checked ) { //<-- complete linkage
		best = Math.min( num1, num2 );
	}
	else if( linkage[2].checked ) { //<-- average linkage
		best = mean( num1, num2 );
	}
	else { //<-- single linkage
		best = Math.max( num1, num2 );
	}

	return best;
}

function updateTableAndQueue( simTable, newClusSims ) {
	//add new clusters to simTable and priorityQueue
	for( var key of newClusSims.keys() ) {
		simTable.set( key, newClusSims.get( key ) );
		priorityQueue = addToQueue( priorityQueue, simTable, key );
	}

	//take out redundant clusters from priorityQueue
	for( var c = 0; c < priorityQueue.length; c++ ) {
		if( simTable.has( priorityQueue[c] ) === false ) {
			priorityQueue.splice( c, 1 );
			c--;
		}
	}
	return simTable;
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
	ctx.strokeStyle = "#98bf21";
	ctx.rotate(degrees*Math.PI/180);
	ctx.translate(-250, -250); //<-- put it back
	ctx.arc(250,250,25,0,1.5*Math.PI);
	ctx.stroke();
	ctx.restore();
}

function stopSpin() {
	clearInterval(interval);
	document.getElementById("spinner").style.display = "none";
}

function visualise( simTable ) {
	dataset = level[level.length - 1 ];
	console.log( dataset );

	var currentLevel = 0;
	var largestClus = 0;
	for( var j = 0; j < dataset.length; j++ ) {
		var clusLength = dataset[j].split( "-" ).length;
		currentLevel += clusLength;
		if( clusLength > largestClus ) {
			largestClus = clusLength;
		}
	}

	resetButtonBox( currentLevel );	
	
	var w = 500;
	var h = 500;
	var padding = 20;

	var xScale = d3.scale.linear()
				.domain([ 0, 3 ])
				.range([ w / 4, w - (w / 4)]);

	var rScale = d3.scale.linear()
				.domain([ 0, largestClus ])
				.range([10, 50]);

	var svg = d3.select("#visual")
				.append("svg")
				.attr("width", w)
				.attr("height", h)
				.attr("id", "clusterVis");
	
	svg.selectAll("circle")
		.data(dataset)
		.enter()
		.append("circle")
		.attr("cx", function(d, i) {
			return xScale( i );
		})
		.attr("cy", function(d, i) {
			return h / 2;
		})
		.attr("r", function(d) {
			return rScale((d.length - 1) / 2);
		})
		.on("mouseover", function(d, i) {
			var yPos = parseFloat(d3.select("svg").attr("y"));
			var frequency;
			if( i === 0 ) { frequency = frequency1; }
			else if( i === 1 ) { frequency = frequency2; }
			else if( i === 2 ) { frequency = frequency3; }
			else { frequency = frequency4; }

			var topThree = "";
			var count = 0;
			for( var key of frequency.keys() ) {
				count++;
				topThree += key + " " + frequency.get( key ) + " "; 
				if( count === 3 ) { break; }
			}

			d3.select("#tooltip")
				.style("left", 0)
				.style("top", yPos + "px")
				.select("#value")
				.text( topThree );

			d3.select("#tooltip").classed("hidden", false);
		})
		.on("mouseout", function() {
			d3.select("#tooltip").classed("hidden", true);
		})
		.on("click", function(d) {
			//get parents of clicked cluster
			var tmp = clusRef.get( d );
			//get grandparents of clicked cluster
			dataset = [];
			if( clusRef.get( tmp[0] ) !== undefined ) {
				dataset = dataset.concat( clusRef.get( tmp[0] ) );
			}
			if( clusRef.get( tmp[1] ) !== undefined ) {
				dataset = dataset.concat( clusRef.get( tmp[1] ) ); 
			}
			console.log( dataset );

			if( dataset.length !== 0 ) {
				currentLevel = 0;
				for( var j = 0; j < dataset.length; j++ ) {
					var clusLength = dataset[j].split( "-" ).length;
					currentLevel += clusLength;
				}
				patternsPresent.innerHTML = "Patterns Present: " + currentLevel;
			
				var circle = svg.selectAll("circle")
						.data(dataset);

				circle.exit().attr("r", 0).remove();

				circle.enter().append("circle")
					.transition()
					.duration(2000)
					.ease("circle")
					.attr("cx", function(d, i) {
						return xScale( i );
					})
					.attr("cy", function(d, i) {
						return h / 2;
					})
					.attr("r", function(d) {
						return rScale((d.length - 1) / 2);
					});

				circle.transition()
					.delay( function(d, i) {
						return i * 100;
					})
					.duration(2000)
					.ease("circle")
					.attr("cx", function(d, i) {
					return xScale( i );
				})
				.attr("cy", function(d, i) {
					return h / 2;
				})
				.attr("r", function(d) {
					return rScale((d.length - 1) / 2);
				});

				clearTable();
				frequencyTable( dataset );
			}
			else {
				alert( "This cluster has no parents" );
			}
		});
}

function resetButtonBox( currentLevel ) {
	patternsPresent.innerHTML = "Patterns Present: " + currentLevel;
	var reset = document.createElement("button");
	reset.addEventListener( "click", resetClusters );
	t = document.createTextNode( "Reset" );
	reset.appendChild( t );
	document.getElementById( "patternCount" ).appendChild( reset );
}

function frequencyTable( c ) {

	if( c.length === 2 ) {
		frequency1 = getFrequency( c[0] );
		frequency2 = getFrequency( c[1] );
	
		total = combine( frequency1, frequency2 );
		sortedTotal = sortTotal( total );
	}
	else {
		frequency1 = getFrequency( c[0] );
		frequency2 = getFrequency( c[1] );
		frequency3 = getFrequency( c[2] );
		frequency4 = getFrequency( c[3] );
	
		total = combine( frequency1, frequency2 );
		total = combine( total, frequency3 );
		total = combine( total, frequency4 );
		sortedTotal = sortTotal( total );
	}

	for( var i = 0; i < 10; i++ ) {
		var tr = table.insertRow();

		var column1 = tr.insertCell();
		column1.appendChild(document.createTextNode( sortedTotal[i].pattern ));
		column1.style.border = "1px solid black";

		var column2 = tr.insertCell();
		column2.appendChild(document.createTextNode( sortedTotal[i].frequency ));
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
	table.deleteRow(1);

	for( var i = 0; i < 10; i++ ) {
		var tr = table.insertRow();

		var column1 = tr.insertCell();
		column1.appendChild(document.createTextNode( sortedTotal[i].pattern ));
		column1.style.border = "1px solid black";

		var column2 = tr.insertCell();
		column2.appendChild(document.createTextNode( sortedTotal[i].frequency ));
		column2.style.border = "1px solid black";

		tr.addEventListener( "click", clickRow );
	}
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

	for( var i = 0; i < sortedTotal.length; i++ ) {
		var row = sortedTotal[i].pattern;
		if( row.indexOf( entity ) != -1 ) {
			var tr = table.insertRow();

			var column1 = tr.insertCell();
			column1.appendChild(document.createTextNode( sortedTotal[i].pattern ));
			column1.style.border = "1px solid black";

			var column2 = tr.insertCell();
			column2.appendChild(document.createTextNode( sortedTotal[i].frequency ));
			column2.style.border = "1px solid black";

			//tr.addEventListener( "click", clickRow );
		}
	}
	document.body.appendChild( table );
}

function clearTable() {
	for( var i = table.rows.length - 1; i > 0; i-- ) {
		table.deleteRow(i);
	}
}

function clickRow() {
	//clear the colour of all rows
	var rows = table.rows;
	for( var i = 0; i < rows.length; i++ ) {
		rows[i].style.backgroundColor = "";
	}

	//change colour of the selected row
	this.style.backgroundColor = "#98bf21";

	var ef1 = frequency1.get( this.cells[0].innerHTML );
	var ef2 = frequency2.get( this.cells[0].innerHTML );
	var ef3 = frequency3.get( this.cells[0].innerHTML );
	var ef4 = frequency4.get( this.cells[0].innerHTML );

	if( ef1 === undefined ) { ef1 = 0; }
	if( ef2 === undefined ) { ef2 = 0; }
	if( ef3 === undefined ) { ef3 = 0; }
	if( ef4 === undefined ) { ef4 = 0; }
			
	//convert ratio to percentage
	ef1 = Math.round( (ef1 * 100) / parseInt( this.cells[1].innerHTML ) );
	ef2 = Math.round( (ef2 * 100) / parseInt( this.cells[1].innerHTML ) );
	ef3 = Math.round( (ef3 * 100) / parseInt( this.cells[1].innerHTML ) );
	ef4 = Math.round( (ef4 * 100) / parseInt( this.cells[1].innerHTML ) );

	reVisualise( ef1, ef2, ef3, ef4 );
}

function getFrequency( cluster ) {
	patternRefs = cluster.split( "-" );
	var pat = [];
	frequency = new Map();
	for( var i = 0; i < patternRefs.length; i++ ) {
		pat = patterns.get( parseInt(patternRefs[i]) );
		for( var j = 0; j < pat.length; j++ ) {

			if( pat[j] === 1 && frequency.has( entity.get(j) ) ) {
				frequency.set( entity.get(j), frequency.get( entity.get(j) ) + 1 );
			}
			if( pat[j] === 1 && !frequency.has( entity.get(j) ) ) {
				frequency.set( entity.get(j), 1 );
			}
			
		}
	}
	return frequency;
}

function combine( f1, f2 ) {
	var total = new Map();
	var checked = [];
	for( var key of f1.keys() ) {
		if( f2.has( key ) ) {
			total.set( key, f1.get( key ) + f2.get( key ) );
			checked.push( key );
		}
	}

	for( var key of f2.keys() ) {
		if( !checked.contains( key ) && f1.has( key ) ) {
			total.set( key, f2.get( key ) );
		}
	}
	return total;
}

function sortTotal( total ) {
	var sortedTotal = [];
	for( var key of total.keys() ) {
		var entity = {
			pattern : key,
			frequency : total.get( key )
		};
		var inserted = false;
		for( var i = 0; i < sortedTotal.length; i++ ) {
			if( total.get( key ) > sortedTotal[i].frequency ) {
				sortedTotal.splice( i, 0, entity );
				inserted = true;
				break;
			}
		}
		if( inserted === false ) {
			sortedTotal.push( entity );
		}
	}
	return sortedTotal;
}

function findFrequency( cluster, entity ) {
	for( var i = 0; i < cluster.length; i++ ) {
		if( cluster[i].pattern === entity ) {
			return cluster[i].frequency;
		}
	} 
	return 0;
}

function reVisualise( ef1, ef2, ef3, ef4 ) {
	//remove previous visual
	var visual = document.getElementById( "visual" );
	var clusterVis = document.getElementById( "clusterVis" );
	visual.removeChild( clusterVis );

	console.log( dataset );

	var currentLevel = 0;
	var largestClus = 0;
	for( var j = 0; j < dataset.length; j++ ) {
		var clusLength = dataset[j].split( "-" ).length;
		currentLevel += clusLength;
		if( clusLength > largestClus ) {
			largestClus = clusLength;
		}
	}
	patternsPresent.innerHTML = "Patterns Present: " + currentLevel;

	for( var i = table.rows.length - 1; i > 0; i-- ) {
		table.deleteRow(i);
	}
	frequencyTable( dataset );
	
	var w = 500;
	var h = 500;
	var padding = 20;

	var xScale = d3.scale.linear()
				.domain([ 0, 3 ])
				.range([ w / 4, w - (w / 4)]);

	var rScale = d3.scale.linear()
				.domain([ 0, largestClus ])
				.range([10, 50]);

	var colourScale = d3.scale.linear()
						.domain([ 0, 100 ])
						.range([ 0, 255 ]);

	var svg = d3.select("#visual")
				.append("svg")
				.attr("width", w)
				.attr("height", h)
				.attr("id", "clusterVis");
	
	svg.selectAll("circle")
		.data(dataset)
		.enter()
		.append("circle")
		.attr("cx", function(d, i) {
			return xScale( i );
		})
		.attr("cy", function(d, i) {
			return h / 2;
		})
		.attr("r", function(d) {
			return rScale((d.length - 1) / 2);
		})
		.style("fill", function(d,i) {
			if( i === 0 ) { return d3.rgb( colourScale(ef1), 0, 0 ); }
			else if( i === 1 ) { return d3.rgb( colourScale(ef2), 0, 0 ); }
			else if( i === 2 ) { return d3.rgb( colourScale(ef3), 0, 0 ); }
			else { return d3.rgb( colourScale(ef4), 0, 0 ); }
		})
		.on("mouseover", function(d, i) {
			var yPos = parseFloat(d3.select("svg").attr("y"));
			var frequency;
			if( i === 0 ) { frequency = frequency1; }
			else if( i === 1 ) { frequency = frequency2; }
			else if( i === 2 ) { frequency = frequency3; }
			else { frequency = frequency4; }

			var topThree = "";
			var count = 0;
			for( var key of frequency.keys() ) {
				count++;
				topThree += key + " " + frequency.get( key ) + " "; 
				if( count === 3 ) { break; }
			}

			d3.select("#tooltip")
				.style("left", 0)
				.style("top", yPos + "px")
				.select("#value")
				.text( topThree );

			d3.select("#tooltip").classed("hidden", false);
		})
		.on("mouseout", function() {
			d3.select("#tooltip").classed("hidden", true);
		})
		.on("click", function(d) {
			//get parents of clicked cluster
			var tmp = clusRef.get( d );
			//get grandparents of clicked cluster
			dataset = [];
			if( clusRef.get( tmp[0] ) !== undefined ) {
				dataset = dataset.concat( clusRef.get( tmp[0] ) );
			}
			if( clusRef.get( tmp[1] ) !== undefined ) {
				dataset = dataset.concat( clusRef.get( tmp[1] ) ); 
			}
			console.log( dataset );

			if( dataset.length !== 0 ) {
				currentLevel = 0;
				for( var j = 0; j < dataset.length; j++ ) {
					var clusLength = dataset[j].split( "-" ).length;
					currentLevel += clusLength;
				}
				patternsPresent.innerHTML = "Patterns Present: " + currentLevel;
			
				var circle = svg.selectAll("circle")
						.data(dataset);

				circle.exit().attr("r", 0).remove();

				circle.enter().append("circle")
					.transition()
					.duration(2000)
					.ease("circle")
					.attr("cx", function(d, i) {
						return xScale( i );
					})
					.attr("cy", function(d, i) {
						return h / 2;
					})
					.attr("r", function(d) {
						return rScale((d.length - 1) / 2);
					})
					.style("fill", "black");

				circle.transition()
					.delay( function(d, i) {
						return i * 100;
					})
					.duration(2000)
					.ease("circle")
					.attr("cx", function(d, i) {
					return xScale( i );
				})
				.attr("cy", function(d, i) {
					return h / 2;
				})
				.attr("r", function(d) {
					return rScale((d.length - 1) / 2);
				})
				.style("fill", "black");

				clearTable();
				frequencyTable( dataset );
			}
			else {
				alert( "This cluster has no parents" );
			}
		});
}

function resetClusters() {
	dataset = level[level.length - 1 ]; 
	reVisualise( 0, 0, 0, 0 );
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
