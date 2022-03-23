const helpFunctions = {

    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    },
    
    mergeDeep(target, source) {
        let output = Object.assign({}, target);
        if (helpFunctions.isObject(target) && helpFunctions.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (helpFunctions.isObject(source[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = helpFunctions.mergeDeep(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
}

module.exports = helpFunctions;