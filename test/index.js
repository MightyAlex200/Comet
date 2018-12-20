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
    const testPostEntry = {
        title: 'This is a test post',
        content: 'This is the content of the post',
        timestamp: '',
        key_hash: '<insert your agent key here>', // This is the actual agent key for tests
    };
    testPost = app.call('posts', 'main', 'create_post', {
        post: testPostEntry,
        tags: [1, 2],
    });
    t.equals(testPost, 'QmdoTsf1Qfv7B7kWEhtsevbu3w6BgzEDt9GNaKCktT65xL', 'Address is correct');

    t.deepEquals(
        app.call('posts', 'main', 'user_posts', {
            author: '<insert your agent key here>'
        }),
        ['QmdoTsf1Qfv7B7kWEhtsevbu3w6BgzEDt9GNaKCktT65xL'],
        'Author has posts attributed to them'
    );

    (() => {
        const post_tags = app.call('posts', 'main', 'post_tags', {
            post: testPost,
        });
        const ok =
            post_tags.original_tags &&
            post_tags.crosspost_tags &&
            post_tags.original_tags.length == 2 &&
            post_tags.crosspost_tags.length == 0 &&
            post_tags.original_tags.includes(1) &&
            post_tags.original_tags.includes(2);
        t.ok(ok, 'Post tags are valid');
    })();

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "exactly", values: 1 },
            exclude_crossposts: false,
        }),
        [{ address: testPost, in_terms_of: [1] }],
        'Exactly query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "exactly", values: 5 },
            exclude_crossposts: false,
        }),
        [],
        'Exactly query finds no post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 1 }] },
            exclude_crossposts: false,
        }),
        [{ address: testPost, in_terms_of: [1] }],
        'Or query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 8 }] },
            exclude_crossposts: false,
        }),
        [],
        'Or query finds no post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        [{ address: testPost, in_terms_of: [1, 2] }],
        'And query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 0 }, { type: "exactly", values: 3 }] },
            exclude_crossposts: false,
        }),
        [],
        'And query finds no post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 2 }, { type: "exactly", values: 5 }] },
            exclude_crossposts: false,
        }),
        [{ address: testPost, in_terms_of: [2] }],
        'Not query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        [],
        'Not query finds no post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        [{ address: testPost, in_terms_of: [2] }],
        'Xor query finds post'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        [],
        'Xor query finds no post'
    );

    t.equals(
        app.call('posts', 'main', 'crosspost', {
            post: testPost,
            tags: [3, 4],
        }),
        true,
        'Crossposting returns true'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: 'and', values: [{ type: 'exactly', values: 3 }, { type: 'exactly', values: 4 }] },
            exclude_crossposts: false,
        }),
        [{ address: 'QmdoTsf1Qfv7B7kWEhtsevbu3w6BgzEDt9GNaKCktT65xL', in_terms_of: [3, 4] }],
        'Crossposts can be found with search'
    );

    t.deepEquals(
        app.call('posts', 'main', 'search', {
            query: { type: 'and', values: [{ type: 'exactly', values: 3 }, { type: 'exactly', values: 4 }] },
            exclude_crossposts: true,
        }),
        [],
        'Crossposts can be excluded with search'
    );

    (() => {
        const post_tags = app.call('posts', 'main', 'post_tags', {
            post: testPost,
        });
        const ok =
            post_tags.original_tags &&
            post_tags.crosspost_tags &&
            post_tags.original_tags.length == 2 &&
            post_tags.crosspost_tags.length == 2 &&
            post_tags.original_tags.includes(1) &&
            post_tags.original_tags.includes(2) &&
            post_tags.crosspost_tags.includes(3) &&
            post_tags.crosspost_tags.includes(4);
        t.ok(ok, 'Post tags are valid with crosspost tags');
    })();

    t.deepEqual(
        app.call('posts', 'main', 'read_post', {
            post: testPost
        }),
        testPostEntry,
        'Posts can be read',
    );

    const updatedTestPostEntry = { ...testPostEntry, content: 'Updated test post' };

    t.deepEqual(
        app.call('posts', 'main', 'update_post', {
            old_post: testPost,
            new_post: updatedTestPostEntry,
        }),
        'QmcNN7YiESAeto9Mx6gULW44ix3duvoVGXQLDmZMb4A65X',
        'Posts can be updated',
    );

    t.deepEqual(
        app.call('posts', 'main', 'read_post', {
            post: 'QmcNN7YiESAeto9Mx6gULW44ix3duvoVGXQLDmZMb4A65X',
        }),
        updatedTestPostEntry,
        'Updated posts can be read',
    );

    t.deepEqual(
        app.call('posts', 'main', 'delete_post', {
            old_post: testPost
        }),
        true,
        'Posts can be deleted',
    );

    t.deepEqual(
        app.call('posts', 'main', 'read_post', {
            post: testPost
        }),
        null, // TODO: Is this actually what is returned when an entry is removed?
        'Posts can\'t be read after deletion',
    );

    t.end();
});

test('Test comments zome', t => {
    const postAddress = app.call('posts', 'main', 'create_post', {
        post: {
            title: 'Testing post',
            content: 'This post is used for testing the comments zome',
            timestamp: '',
            key_hash: '<insert your agent key here>',
        },
        tags: [0]
    });

    const commentEntry = {
        content: 'This is a comment!',
    };

    const otherCommentEntry = {
        content: 'This is another comment!',
    };

    const commentAddress = app.call('comments', 'main', 'create_comment', {
        comment: commentEntry,
        target: postAddress,
    });

    const otherCommentAddress = app.call('comments', 'main', 'create_comment', {
        comment: otherCommentEntry,
        target: commentAddress,
    });

    t.equals(
        commentAddress,
        'QmX4PgWtKigQutvoCY6XT3oN2974T26zhPm5iRhasHoHg3',
        'Address is correct, comments can be made on posts'
    );

    t.equals(
        otherCommentAddress,
        'QmRs4WaAzHpuvRrVcN2SfFQx8hJ9Sqmmfb8fPVkimrwAJX',
        'Address is correct, comments can be made on other comments'
    );

    t.deepEquals(
        app.call('comments', 'main', 'read_comment', {
            comment: commentAddress
        }),
        commentEntry,
        'Comments can be read'
    );

    const updatedCommentEntry = { content: 'This is an updated comment.' };

    t.deepEqual(
        app.call('comments', 'main', 'update_comment', {
            old_comment: commentAddress,
            new_comment: updatedCommentEntry,
        }),
        'QmegNB3W4NsKC2BHzRd1DVTxLxNwLBtaVgEyFHXKsMjsVE',
        'Comments can be updated',
    );

    t.deepEqual(
        app.call('comments', 'main', 'read_comment', {
            comment: updatedCommentEntry,
        }),
        updatedCommentEntry,
        'Updated comments can be read',
    );

    t.equal(
        app.call('comments', 'main', 'delete_comment', {
            comment: commentAddress
        }),
        true,
        'Comments can be deleted',
    );

    t.deepEqual(
        app.call('comments', 'main', 'read_comment', {
            comment: commentAddress
        }),
        null, // TODO: Is this actually what is returned when an entry is removed?
        'Comments can\'t be read after deletion',
    );

    // TODO: Do deleted entries show up here?

    t.deepEqual(
        app.call('comments', 'main', 'comments_from_address', {
            address: postAddress,
        }),
        ['QmegNB3W4NsKC2BHzRd1DVTxLxNwLBtaVgEyFHXKsMjsVE'],
        'Comments can be retrieved from the address of a post',
    );

    t.deepEqual(
        app.call('comments', 'main', 'comments_from_address', {
            // TODO: Should this be the address of the updated post?
            address: commentAddress,
        }),
        ['QmRs4WaAzHpuvRrVcN2SfFQx8hJ9Sqmmfb8fPVkimrwAJX'],
        'Comments can be retrieved from the address of a comment',
    );

    t.end();
});
