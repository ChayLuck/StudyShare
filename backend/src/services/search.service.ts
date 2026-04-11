import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

const INDEX_NAME = 'studyshare_metadata';

export const initElasticSearch = async () => {
    try {
        const indexExists = await client.indices.exists({ index: INDEX_NAME });
        if (!indexExists) {
            await client.indices.create({
                index: INDEX_NAME,
                body: {
                    mappings: {
                        properties: {
                            type: { type: 'keyword' }, // 'school' or 'course'
                            name: { type: 'text' },
                        }
                    }
                }
            });
            console.log('ElasticSearch index created.');
        }
    } catch (e) {
        console.error('Failed to init ElasticSearch (is it running?):', e);
    }
};

export const indexMetadata = async (type: 'school' | 'course', name: string) => {
    try {
        // Uppercase as per requirement
        const upperName = name.toUpperCase();
        
        // Check if exists
        const exists = await client.search({
            index: INDEX_NAME,
            body: {
                query: {
                    bool: {
                        must: [
                            { match: { type } },
                            { match_phrase: { name: upperName } }
                        ]
                    }
                }
            }
        });
        
        if (exists.hits.total && (exists.hits.total as any).value === 0) {
            await client.index({
                index: INDEX_NAME,
                body: {
                    type,
                    name: upperName
                }
            });
            // Force refresh for immediate searchability
            await client.indices.refresh({ index: INDEX_NAME });
        }
    } catch (e) {
        console.error('Error indexing metadata:', e);
    }
};

export const searchMetadata = async (type: 'school' | 'course', query: string) => {
    try {
        const upperQuery = query.toUpperCase();
        const result = await client.search({
            index: INDEX_NAME,
            body: {
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
            }
        });
        
        return result.hits.hits.map(hit => (hit._source as any).name);
    } catch (e) {
        console.error('Error searching metadata:', e);
        return [];
    }
};
