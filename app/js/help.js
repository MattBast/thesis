//the help boxes
var fileInputHelpBox = document.getElementById( "fileInputHelpBox" );
var numberOfNodesHelpBox = document.getElementById( "numberOfNodesHelpBox" );
var patternCountHelpBox = document.getElementById( "patternCountHelpBox" );

function helpOpen( box ) {
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

function helpClose( box ) {
	var opacity = 1; //<-- initial opacity
	var timer = setInterval( function() {
		//stop decreasing opacity when reach 0.1
		if( opacity <= 0.1 ) {
			clearInterval( timer );
			box.style.display = "none";
		}
		//decrease opacity
		box.style.opacity = opacity;
		box.style.filter = "alpha(opacity=" + opacity * 100 + ")";
		opacity -= opacity * 0.1;
	}, 50 );
}