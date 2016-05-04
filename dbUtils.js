var config = require('./config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var constants = require('./constants')
var kew = require('kew')

/**
 * Orchestrate query wrappers ---------------------------------->
 */
function createGraphRelationPromise(from, fromKey, to, toKey, relationName) {
    return db.newGraphBuilder()
        .create()
        .from(from, fromKey)
        .related(relationName)
        .to(to, toKey);
}

/**
 * @param collection
 * @param id
 * @param relation
 * @returns {GraphBuilder}
 */
function getGraphResultsPromise(collection, id, relation) {
    return db.newGraphReader()
        .get()
        .from(collection, id)
        .related(relation)
}

/**
 * join a set of queries with AND, OR conditions
 * for lucene/orchestrate
 * @param queries
 * @param type
 */
function queryJoiner(queries) {
    var returnQuery = ""
    queries.forEach(function (query) {
        returnQuery += "("
        returnQuery += query
        returnQuery += ") AND "
    })
    returnQuery = returnQuery.substring(0, returnQuery.length - 5)
    return returnQuery
}

/**
 * join a set of queries with AND, OR conditions
 * for lucene/orchestrate
 * @param queries
 * @param type
 */
function queryJoinerOr(queries) {
    var returnQuery = ""
    queries.forEach(function (query) {
        returnQuery += "("
        returnQuery += query
        returnQuery += ") OR "
    })
    if (returnQuery != "")
        returnQuery = returnQuery.substring(0, returnQuery.length - 4)
    return returnQuery
}

/**
 * generates a lucene OR query for a set of values (theArray)
 * for a specific key (searchKey) to search for
 * @param theArray
 * @param searchKey
 * @returns {string}
 */
function createFieldORQuery(theArray, searchKey) {
    var theQuery = searchKey + ": ("
    theArray.forEach(function (oneItem) {
        theQuery += "`" + oneItem + "` OR "
    })
    theQuery = theQuery.substring(0, theQuery.length - 4);
    theQuery += ")"
    return theQuery
}

/**
 * create a distance query for orchestrate
 * assuming the field name is "location"
 * @param lat
 * @param long
 * @param radius
 * @returns {string}
 */
function createDistanceQuery(lat, long, radius) {
    var theDistanceQuery = "value.location:NEAR:{lat:" + parseFloat(lat) + " lon:" + parseFloat(long) + " dist:" + radius + "}";
    return theDistanceQuery
}

/**
 * create a eventId search query
 * @param eventId
 */
function createSearchByIdQuery(id) {
    var searchByIdQuery = "@path.key:" + id + ""
    return searchByIdQuery
}

function createFieldQuery(field, value) {
    return "value." + field + ":`" + value + "`"
}

/**
 * a little fuzzy with the query,
 * search-- expecting sanitized value
 * @param field
 * @param value
 * @returns {string}
 */
function createFuzzyQuery(field, value) {
    return "value." + field + ":" + value + "*"
}

/**
 * check if key exists.
 * fully qualified path expected:
 * _exists_:value.sports.pool
 * @param fieldPath
 */
function createExistsQuery(fieldPath) {
    //escape any spaces in the field path
    fieldPath = fieldPath.replace(/\s/g, '\\ ')
    return "_exists_:" + fieldPath
}

/**
 * Inserts the id into every response object
 * extracted from orchestrate's "path" key
 * @param results
 * @returns {Array}
 */
function injectId(results) {
    var response = results.body.results.map(function (aResult) {
        var value = aResult.value
        value["id"] = aResult.path.key
        return value
    })
    return response
}

/**
 * when you do a db.post
 * the id of the newly created record is present in the header
 * this method returns that id
 * @param result
 * @returns {*}
 */
function getIdAfterPost(result) {
    return result.headers.location.match(/[0-9a-z]{16}/)[0];
}

/**
 * Delete a graph relation from orchestrate
 * @param from
 * @param fromKey
 * @param to
 * @param toKey
 * @param relationName
 */
function deleteGraphRelationPromise(from, fromKey, to, toKey, relationName) {
    return db.newGraphBuilder()
        .remove()
        .from(from, fromKey)
        .related(relationName)
        .to(to, toKey);
}

/**
 * generate a one on one graph relation query
 * @param sourceCollection
 * @param sourceId
 * @param destinationCollection
 * @param destinationId
 */
function createGetOneOnOneGraphRelationQuery(sourceCollection, sourceId, relation, destinationCollection, destinationId) {
    var query =
        "@path.kind:relationship AND @path.source.collection:`" +
        sourceCollection +
        "` AND @path.source.key:`" +
        sourceId + "` AND @path.relation:`" +
        relation + "` AND @path.destination.collection:`" +
        destinationCollection + "` AND @path.destination.key:`" +
        destinationId + "`"
    return query
}

var emptyOrchestrateResponse = {
    body: {
        total_count: 0,
        results: []
    }
}

function getAllResultsFromList(collection, idList) {
    //how long can the largest lucene query to orchestrate be?
    //TODO: test the longerst lucene query or this breaks?
    var queries = []
    console.log(idList)

    idList.forEach(function (id) {
        queries.push(createSearchByIdQuery(id))
    })
    var finalQuery = queryJoinerOr(queries)
    console.log(finalQuery)
    if (finalQuery == "") {
        //emulate a result from orchestrate that is empty
        return kew.resolve(emptyOrchestrateResponse)
    }
    else
        return db.newSearchBuilder()
            .collection(collection)
            .limit(100)
            //.offset(0)
            .query(finalQuery)
}

/**
 * this returns an array of promises that allows to retrieve an entire
 * dump of the database collection - again non graph relations
 * @param collection
 * @returns {!Promise}
 */
function allItemsPromisesList(collection, query) {
    console.log("inside allItemsPromisesList")
    var promiseList = kew.defer()
    var promiseListArray = []
    var offset = 0
    db.newSearchBuilder()
        .collection(collection)
        .limit(100)
        .offset(offset)
        .query(query)
        .then(function (results) {
            console.log("this many results")
            console.log(results.body.total_count)
            var totalCount = results.body.total_count
            var remaining = 0
            do {
                promiseListArray.push(
                    db.newSearchBuilder()
                        .collection(collection)
                        .limit(100)
                        .offset(offset)
                        .query(query)
                )
                offset += 100
                remaining = totalCount - offset;
            } while (remaining > 0)
            promiseList.resolve(promiseListArray)
        })
        .fail(function (err) {
            promiseList.reject(err)
        })
    return promiseList
}

/**
 * this returns all the items in a database collection
 * asynchronously - non graph queries
 * @param collection
 * @returns {!Promise}
 */
function getAllItems(collection, query) {
    console.log("anybody home")
    var allItems = kew.defer()
    console.log("Im home!")
    allItemsPromisesList(collection, query)
        .then(function (promiseList) {
            return kew.all(promiseList)
        })
        .then(function (promiseResults) {
            console.log("ok")
            var allItemsList = []
            promiseResults.forEach(function (item) {
                // console.log(item.body.results[0].path.destination)
                var injectedItems = injectId(item)
                allItemsList = allItemsList.concat(injectedItems)
            })
            allItems.resolve(allItemsList)
        })
        .fail(function (err) {
            allItems.reject(err)
        })
    return allItems
}

module.exports = {
    injectId: injectId,
    createGetOneOnOneGraphRelationQuery: createGetOneOnOneGraphRelationQuery,
    createGraphRelationPromise: createGraphRelationPromise,
    createFieldORQuery: createFieldORQuery,
    getGraphResultsPromise: getGraphResultsPromise,
    createSearchByIdQuery: createSearchByIdQuery,
    createDistanceQuery: createDistanceQuery,
    deleteGraphRelationPromise: deleteGraphRelationPromise,
    queryJoiner: queryJoiner,
    getIdAfterPost: getIdAfterPost,
    createFieldQuery: createFieldQuery,
    queryJoinerOr: queryJoinerOr,
    getAllResultsFromList: getAllResultsFromList,
    getAllItems: getAllItems,
    createFuzzyQuery: createFuzzyQuery,
    createExistsQuery : createExistsQuery
}


