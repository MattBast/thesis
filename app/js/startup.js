//fade in and out input boxes
var fileInputBox = document.getElementById("fileInputBox");
var numOfNodesBox = document.getElementById("numOfNodesBox");

//get the file name from the file upload button
var fileInput = document.getElementById( "fileInput" );
fileInput.addEventListener( "change", insertButton );

//the confirm new or existing choice button
var choiceButton = document.getElementById( "choiceButton" );
var choice = document.getElementsByName( "choice" );
choiceButton.addEventListener( "click", clickChoice );

//the confirm button on file upload
var fileUploadButton = document.getElementById( "fileUploadButton" );
fileUploadButton.addEventListener( "click", clickUpload );

//the variables controlling the loading spinner
var c = document.getElementById( "canvas" );
var ctx = c.getContext( "2d" );
var loading = document.getElementById( "loading" );
var degrees = 0;
var timer;

//-------------- fade in and out startup box functions ---------------

function fadeIn( box ) {
	box.style.display = "block";
	var opacity = 0.1; //<-- initial opacity
	var timer = setInterval( function() {
		//stop increasing opacity when reach 1
		if( opacity >= 1 ) {
			clearInterval( timer );
		}
		//increase opacity
		box.style.opacity = opacity;
		box.style.filter = "alpha(opacity=" + opacity * 100 + ")";
		opacity += opacity * 0.1;
	}, 50 );
}

function fadeOut( box, fadeInBox ) {
	var opacity = 1; //<-- initial opacity
	var timer = setInterval( function() {
		//stop decreasing opacity when reach 0.1
		if( opacity <= 0.1 ) {
			clearInterval( timer );
			box.style.display = "none";
			//fade in next div if one has been specified
			if( fadeInBox !== undefined ) {
				fadeIn( fadeInBox );
			}
			//otherwise start the loading spinner
			else {
				spin();
			}
		}
		//decrease opacity
		box.style.opacity = opacity;
		box.style.filter = "alpha(opacity=" + opacity * 100 + ")";
		opacity -= opacity * 0.1;
	}, 50 );
}

function insertButton() {
	if( fileInput.files.length === 0 ) {
		alert( "No file selected" );
	}
	else {
		fileUploadButton.style.opacity = 1;
	}
}

function clickUpload() {
	if( fileInput.files.length === 0 ) {
		alert( "Please select a file first" );
	}
	else {
		fadeOut( fileInputBox, numOfNodesBox );
	}
}

function clickChoice() {
	if( choice[0].checked === true ) {
		fadeOut( choiceBox, fileInputBox );
	}
	else {
		fadeOut( choiceBox, savedFileInputBox );
	}
}

//-------------------- loading spinner functions -------------------

function spin() {
	//display the spinner
	c.style.display = "block";
	loading.style.display = "block";

	//start spinning
	timer = setInterval( turn, 5 );

	//upload the file
	upload(); 
}

function turn() {
	//turn canvas one extra degrees per tick interval
	degrees += 1;
	if( degrees > 360 ) {
		degrees = 0;
	}

	rotate( degrees ); //<-- turn canvas
	drawSpinner(); //<-- draw new spinner circle
}

function rotate( degrees ) {
	ctx.save();
	ctx.clearRect( 0, 0, c.width, c.height );

	ctx.translate( 1000, 200 ); //<-- move rotation point to centre of canvas
	ctx.rotate( degrees*Math.PI/180 ); //<-- rotate canvas
	ctx.translate( -1000, -200 ); //<-- move rotation point back to top left
}

function drawSpinner() {
	//colour and width of line
	ctx.strokeStyle = "#98bf21";
	ctx.lineWidth = 5;

	//draw circle with gap in it
	ctx.beginPath();
	ctx.arc( 1000, 200, 75, 0, 1.8*Math.PI );
	ctx.stroke();
	ctx.restore();
}

function stopSpin() {
	//hide the spinner
	c.style.display = "none";
	loading.style.display = "none";

	//stop spinning the canvas
	clearInterval( timer );
}