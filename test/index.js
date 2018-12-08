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

test('Create anchor, has valid hash, exists, appears in `anchors`', t => {
    const testAnchorAddress = app.call('anchors', 'main', 'anchor', { anchor: testAnchor });
    t.equals(testAnchorAddress, 'QmZ2SRVaC3nazwUxqzzc9ARSPZcLi5WqLMd5PsT4bAFqj2', 'Address is correct')

    t.equals(
        app.call('anchors', 'main', 'exists', {
            anchor_address: testAnchorAddress
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
        [testAnchorAddress],
        "Exactly 1 anchor with type 'type'"
    );

    t.deepEquals(
        app.call('anchors', 'main', 'anchors', {
            anchor_type: 'unused type'
        }),
        [],
        "No anchor with the type 'unused type'"
    );

    // ends this test
    t.end();
});
