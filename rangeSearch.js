function rangeSearch(value, min, max, inclusive){
	if(value === undefined){
		return false
	}
	else {
		if(inclusive){
			return (min <= value && max >= value)	
		}
		else {
			return (min < value && max > value)
		}
	}
}