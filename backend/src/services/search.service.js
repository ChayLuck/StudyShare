"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMetadata = exports.indexMetadata = exports.initElasticSearch = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const client = new elasticsearch_1.Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});
const INDEX_NAME = 'studyshare_metadata';
const initElasticSearch = async () => {
    try {
        const indexExists = await client.indices.exists({ index: INDEX_NAME });
        if (!indexExists) {
            await client.indices.create({
                index: INDEX_NAME,
                mappings: {
                    properties: {
                        type: { type: 'keyword' }, // 'school' or 'course'
                        name: { type: 'text' },
                    }
                }
            });
            console.log('ElasticSearch index created.');
        }
    }
    catch (e) {
        console.error('Failed to init ElasticSearch (is it running?):', e);
    }
};
exports.initElasticSearch = initElasticSearch;
const indexMetadata = async (type, name) => {
    try {
        // Uppercase as per requirement
        const upperName = name.toUpperCase();
        // Check if exists
        const exists = await client.search({
            index: INDEX_NAME,
            query: {
                bool: {
                    must: [
                        { match: { type } },
                        { match_phrase: { name: upperName } }
                    ]
                }
            }
        });
        if (exists.hits.total && exists.hits.total.value === 0) {
            await client.index({
                index: INDEX_NAME,
                document: {
                    type,
                    name: upperName
                }
            });
            // Force refresh for immediate searchability
            await client.indices.refresh({ index: INDEX_NAME });
        }
    }
    catch (e) {
        console.error('Error indexing metadata:', e);
    }
};
exports.indexMetadata = indexMetadata;
const searchMetadata = async (type, query) => {
    try {
        const upperQuery = query.toUpperCase();
        const result = await client.search({
            index: INDEX_NAME,
            query: {
                bool: {
                    must: [
                        { match: { type } },
                        {
                            match: {
                                name: {
                                    query: upperQuery,
                                    fuzziness: 'AUTO'
                                }
                            }
                        }
                    ]
                }
            }
        });
        return result.hits.hits.map(hit => hit._source.name);
    }
    catch (e) {
        console.error('Error searching metadata:', e);
        return [];
    }
};
exports.searchMetadata = searchMetadata;
//# sourceMappingURL=search.service.js.map