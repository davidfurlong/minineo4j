Array.prototype.indexOfAll = function(term) {
	if(typeof term == 'object'){
		console.error('indexOfAll expects an array of terms as an argument');
		return;
	}
	var posOfTerms = [];
	for(i in this){
		if(this[i] == term){
			posOfTerms.push(i);
		}
	}
	return posOfTerms;
}

// proximity distance is distance in words not characters
function proximitySearch(proximity, query, doc){
	var words = query.split(" ");
	var docWords = doc.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"").split(" ");
	var posQueryInDoc = [];
	for(word in words){
		var p = docWords.indexOfAll(words[word]);
		if(p.length == 0){
			// No Match
			return -1;
		}
		posQueryInDoc[word] = p;
	}
	var minProx = calculateMinProximity(posQueryInDoc);
	if(minProx <= proximity)
		// args is an array
		return minProx;
	else
		return -1;
}

function calculateMinProximity(arr){
	console.log(arr);
	var combinations = allPossibleCases(arr);
	console.log(combinations);
	var minProximity = Infinity;
	for(var i = 0; i < combinations.length; i++){
		var sum = 0;
		var posMiddleGround = [];
		var total = 0;
		for(var j = 0; j < combinations[i].length; j++){
			total = total + parseInt(combinations[i][j]);
		}
		var avg = total/combinations[i].length;
		for(var j = 0; j < combinations[i].length; j++){
			var x = (combinations[i].length-1)/2;
			var diff = j-x+avg;
			posMiddleGround[j] = diff;
		}
		for(var j = 0; j < combinations[i].length; j++){
			sum += Math.abs(combinations[i][j]-posMiddleGround[j]);
		}
		for(var j = 0; j < combinations[i].length; j++){
			for(var k = j+1; k < combinations[i].length; k ++){
				if(combinations[i][j] > combinations[i][k]){
					sum = sum - 1;
				}
			}
		}
		if(minProximity > sum){
			minProximity = Math.floor(sum);
		}
	}
	return minProximity;
}

function allPossibleCases(arr) {
	if (arr.length === 0) {
		console.log('0 len');
		return [];
	} 
	else if (arr.length === 1){
		console.log('1 len');
		return arr[0];
	}
	else {
		console.log('x len');
	    var result = [];
	    var allCasesOfRest = allPossibleCases(arr.slice(1));  // recur with the rest of array
	    for (var c = 0;c < allCasesOfRest.length; c ++) {
	      	for (var i = 0; i < arr[0].length; i++) {
	        	result.push([arr[0][i]].concat(allCasesOfRest[c]));
	      	}
	    }
	    return result;
	}
}