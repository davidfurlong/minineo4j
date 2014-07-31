// Wildcards are not supported
// Boosts not supported

function evaluateElement(element, query) {
	// could boost efficiency by using a case switch 
	if(query.operator == "AND"){ // AND, &&
		// we could increase efficiency by putting the smaller / simpler to eval or the more like to be false query on the left
		return evaluateQuery(query.left) && evaluateQuery(query.right)
	}
	else if(query.operator == "OR") { // OR, ||
		return evaluateQuery(query.left) || evaluateQuery(query.right)
	}
	else if(query.operator == "NOT") {
		return evaluateQuery(query.left) && !evaluateQuery(query.right)
	}
	else if(query.operator === undefined){ // single query
		if(!query.hasOwnProperty('inclusive')){
			if(query.hasOwnProperty('term')){
				if(query.hasOwnProperty('proximity')) {
					return (proximitySearch(query.proximity, query.term, element) >=0 ? true : false);
				}
				else {
					return (element.indexOf(query.term) != -1)
				}
			}
		}
		else {
			return rangeSearch(element, query.term_min, query.term_max, query.inclusive)
		}
	}
}

function evaluateIndex(index, query){
	var newRay = [];
	for(i in index){
		for(j in index[i].data){
			var x = evaluateElement(index[i].data.j, query);
			if(x){
				newRay.push(index[i])
			}
		}
	}
	return newRay;
}