//fade in and out input boxes
var fileInputBox = document.getElementById("fileInputBox");
var numOfNodesBox = document.getElementById("numOfNodesBox");

//get the file name from the file upload button
var fileInput = document.getElementById( "fileInput" );
fileInput.addEventListener( "change", insertButton );

//the confirm button on file upload
var fileUploadButton = document.getElementById( "fileUploadButton" );
fileUploadButton.addEventListener( "click", clickButton );

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

function clickButton() {
	if( fileInput.files.length === 0 ) {
		alert( "Please select a file first" );
	}
	else {
		fadeOut( fileInputBox, numOfNodesBox );
	}
}