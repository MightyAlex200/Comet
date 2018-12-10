// This test file uses the tape testing framework.
// To learn more, go here: https://github.com/substack/tape
const test = require('tape');
const Container = require('@holochain/holochain-nodejs');

// instantiate an app from the DNA JSON bundle
const app = Container.loadAndInstantiate("dist/bundle.json");

// activate the new instance
app.start();

// Constants for testing
const testAnchor = { anchor_type: 'type', anchor_text: 'text' };
let anchorAddress;
let testPost;

test('Test anchors zome', t => {
    anchorAddress = app.call('anchors', 'main', 'anchor', { anchor: testAnchor });
    t.equals(anchorAddress, 'QmZ2SRVaC3nazwUxqzzc9ARSPZcLi5WqLMd5PsT4bAFqj2', 'Address is correct')

    t.equals(
        app.call('anchors', 'main', 'exists', {
            anchor_address: anchorAddress
        }),
        true,
        'Anchor exists'
    )

    t.equals(
        app.call('anchors', 'main', 'exists', {
            anchor_address: 'Garbage address'
        }),
        false,
        'Anchors not created do not exist'
    );

    t.deepEquals(
        app.call('anchors', 'main', 'anchors', {
            anchor_type: 'type'
        }),
        [anchorAddress],
        "Exactly 1 anchor with type 'type'"
    );

    t.deepEquals(
        app.call('anchors', 'main', 'anchors', {
            anchor_type: 'unused type'
        }),
        [],
        "No anchor with the type 'unused type'"
    );

    t.end();
});

test('Test posts zome', t => {
    testPost = app.call('posts', 'main', 'create_post', {
        post: {
            title: 'This is a test post',
            content: 'This is the content of the post',
            timestamp: '',
            key_hash: '<insert your agent key here>', // This is the actual agent key for tests
        },
        tags: [1, 2],
    });
    t.equals(testPost, 'QmdoTsf1Qfv7B7kWEhtsevbu3w6BgzEDt9GNaKCktT65xL', 'Address is correct');

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "exactly", values: 1 }
        }),
        [testPost],
        'Exactly query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "exactly", values: 5 }
        }),
        [],
        'Exactly query finds no post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 1 }] }
        }),
        [testPost],
        'Or query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 8 }] }
        }),
        [],
        'Or query finds no post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] }
        }),
        [testPost],
        'And query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 0 }, { type: "exactly", values: 3 }] }
        }),
        [],
        'And query finds no post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 2 }, { type: "exactly", values: 5 }] }
        }),
        [testPost],
        'Not query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] }
        }),
        [],
        'Not query finds no post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 2 }] }
        }),
        [testPost],
        'Xor query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] }
        }),
        [],
        'Xor query finds no post'
    );

    t.end()
});
