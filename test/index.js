// This test file uses the tape testing framework.
// To learn more, go here: https://github.com/substack/tape
const test = require('tape');
const { Config, Container } = require("@holochain/holochain-nodejs");

const dnaPath = "./dist/bundle.json"

// closure to keep config-only stuff out of test scope
const container = (() => {
    const agentAlice = Config.agent("alice");

    const dna = Config.dna(dnaPath);

    const instanceAlice = Config.instance(agentAlice, dna);

    const containerConfig = Config.container([instanceAlice]);
    return new Container(containerConfig);
})();

// Initialize the Container
container.start();

const alice = container.makeCaller('alice', dnaPath);

// Constants for testing
const testAnchor = { anchor_type: 'type', anchor_text: 'text' };
let anchorAddress;
let testPost;

test('Test anchors zome', t => {
    anchorAddress = alice.call('anchors', 'main', 'anchor', { anchor: testAnchor });
    t.deepEquals(anchorAddress, { Ok: 'QmaSQL21LjUj67aieoVyzwyUj36kbuCCsAyuScX5kXFMdB' }, 'Address is correct')

    t.deepEquals(
        alice.call('anchors', 'main', 'exists', {
            anchor_address: anchorAddress.Ok
        }),
        { Ok: true },
        'Anchor exists'
    )

    t.deepEquals(
        alice.call('anchors', 'main', 'exists', {
            anchor_address: 'Garbage address'
        }),
        { Ok: false },
        'Anchors not created do not exist'
    );

    t.deepEquals(
        alice.call('anchors', 'main', 'anchors', {
            anchor_type: 'type'
        }),
        { Ok: { addresses: [anchorAddress.Ok] } },
        "Exactly 1 anchor with type 'type'"
    );

    t.deepEquals(
        alice.call('anchors', 'main', 'anchors', {
            anchor_type: 'unused type'
        }),
        { Ok: { addresses: [] } },
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

    testPost = alice.call('posts', 'main', 'create_post', {
        post: testPostEntry,
        tags: [1, 2],
    });

    t.deepEquals(testPost, { Ok: 'QmP9n5WhX244d72UrV3Pdez4DTjTJaVV4sswUbvB21NEvQ' }, 'Address is correct');

    t.deepEquals(
        alice.call('posts', 'main', 'user_posts', {
            author: 'alice-----------------------------------------------------------------------------AAAIuDJb4M'
        }),
        { Ok: { addresses: [testPost.Ok] } },
        'Author has posts attributed to them'
    );

    (() => {
        const post_tags = alice.call('posts', 'main', 'post_tags', {
            address: testPost.Ok,
        });
        const ok =
            post_tags.Ok &&
            post_tags.Ok.original_tags &&
            post_tags.Ok.crosspost_tags &&
            post_tags.Ok.original_tags.length == 2 &&
            post_tags.Ok.crosspost_tags.length == 0 &&
            post_tags.Ok.original_tags.includes(1) &&
            post_tags.Ok.original_tags.includes(2);
        t.ok(ok, 'Post tags are valid');
    })();

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "exactly", values: 1 },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [1] }] },
        'Exactly query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "exactly", values: 5 },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Exactly query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 1 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [1] }] },
        'Or query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 8 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Or query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [1, 2] }] },
        'And query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 0 }, { type: "exactly", values: 3 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'And query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 2 }, { type: "exactly", values: 5 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [2] }] },
        'Not query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Not query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [2] }] },
        'Xor query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Xor query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'crosspost', {
            post_address: testPost.Ok,
            tags: [3, 4],
        }),
        { Ok: null },
        'Crossposting returns OK'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: 'and', values: [{ type: 'exactly', values: 3 }, { type: 'exactly', values: 4 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [3, 4] }] },
        'Crossposts can be found with search'
    );

    t.deepEquals(
        alice.call('posts', 'main', 'search', {
            query: { type: 'and', values: [{ type: 'exactly', values: 3 }, { type: 'exactly', values: 4 }] },
            exclude_crossposts: true,
        }),
        { Ok: [] },
        'Crossposts can be excluded with search'
    );

    (() => {
        const post_tags = alice.call('posts', 'main', 'post_tags', {
            address: testPost.Ok,
        });
        const ok =
            post_tags.Ok &&
            post_tags.Ok.original_tags &&
            post_tags.Ok.crosspost_tags &&
            post_tags.Ok.original_tags.length == 2 &&
            post_tags.Ok.crosspost_tags.length == 2 &&
            post_tags.Ok.original_tags.includes(1) &&
            post_tags.Ok.original_tags.includes(2) &&
            post_tags.Ok.crosspost_tags.includes(3) &&
            post_tags.Ok.crosspost_tags.includes(4);
        t.ok(ok, 'Post tags are valid with crosspost tags');
    })();

    (() => {
        const read_post = alice.call('posts', 'main', 'read_post', {
            address: testPost.Ok,
        });
        const ok =
            read_post.Ok &&
            read_post.Ok.App &&
            read_post.Ok.App[0] == 'post' &&
            read_post.Ok.App[1];
        t.ok(ok, 'Posts can be read');
        if (ok) {
            t.deepEqual(JSON.parse(read_post.Ok.App[1]), testPostEntry, 'Posts are read correctly');
        }
    })();

    const updatedTestPostEntry = { ...testPostEntry, content: 'Updated test post' };

    t.deepEqual(
        alice.call('posts', 'main', 'update_post', {
            old_address: testPost.Ok,
            new_entry: updatedTestPostEntry,
        }),
        { Ok: 'QmWpi3DmFStPdcBE1Bhd59GvEeM9MKmmpvky8KeidpWzjG' },
        'Posts can be updated',
    );

    (() => {
        const read_post = alice.call('posts', 'main', 'read_post', {
            address: 'QmWpi3DmFStPdcBE1Bhd59GvEeM9MKmmpvky8KeidpWzjG',
        });
        const ok =
            read_post.Ok &&
            read_post.Ok.App &&
            read_post.Ok.App[0] == 'post' &&
            read_post.Ok.App[1];
        t.ok(ok, 'Updated posts can be read');
        if (ok) {
            t.deepEqual(JSON.parse(read_post.Ok.App[1]), updatedTestPostEntry, 'Updated posts are read correctly');
        }
    })();

    t.deepEqual(
        alice.call('posts', 'main', 'delete_post', {
            address: testPost.Ok
        }),
        { Ok: null },
        'Posts can be deleted',
    );

    t.deepEqual(
        alice.call('posts', 'main', 'read_post', {
            address: testPost.Ok
        }),
        { Ok: null },
        'Posts can\'t be read after deletion',
    );

    t.end();
});

test('Test comments zome', t => {
    const postAddress = alice.call('posts', 'main', 'create_post', {
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

    const commentAddress = alice.call('comments', 'main', 'create_comment', {
        comment: commentEntry,
        target: postAddress.Ok,
    });

    // TODO: Fix the rest of these tests when this doesn't hang.
    console.warn("WARNING: As of this commit, the following test hangs the program. If the program continues working, please fix the rest of these tests.");
    const otherCommentAddress = alice.call('comments', 'main', 'create_comment', {
        comment: otherCommentEntry,
        target: commentAddress.Ok,
    });

    t.deepEquals(
        commentAddress,
        { Ok: 'QmX4PgWtKigQutvoCY6XT3oN2974T26zhPm5iRhasHoHg3' },
        'Address is correct, comments can be made on posts'
    );

    t.deepEquals(
        otherCommentAddress,
        { Ok: 'QmRs4WaAzHpuvRrVcN2SfFQx8hJ9Sqmmfb8fPVkimrwAJX' },
        'Address is correct, comments can be made on other comments'
    );

    (() => {
        const read_comment = alice.call('comments', 'main', 'read_comment', {
            address: commentAddress,
        });
        const ok =
            read_comment.Ok &&
            read_comment.Ok.App &&
            read_comment.Ok.App[0] == 'comment' &&
            read_comment.Ok.App[1];
        t.ok(ok, 'Comments can be read');
        if (ok) {
            t.deepEqual(JSON.parse(read_comment.Ok.App[1]), commentEntry, 'Comments are read correctly');
        }
    })();

    const updatedCommentEntry = { content: 'This is an updated comment.' };

    t.deepEqual(
        alice.call('comments', 'main', 'update_comment', {
            old_address: commentAddress,
            new_entry: updatedCommentEntry,
        }),
        'QmegNB3W4NsKC2BHzRd1DVTxLxNwLBtaVgEyFHXKsMjsVE',
        'Comments can be updated',
    );

    t.deepEqual(
        alice.call('comments', 'main', 'read_comment', {
            address: 'QmegNB3W4NsKC2BHzRd1DVTxLxNwLBtaVgEyFHXKsMjsVE',
        }),
        updatedCommentEntry,
        'Updated comments can be read',
    );

    t.equal(
        alice.call('comments', 'main', 'delete_comment', {
            address: commentAddress
        }),
        true,
        'Comments can be deleted',
    );

    t.deepEqual(
        alice.call('comments', 'main', 'read_comment', {
            address: commentAddress
        }),
        null, // TODO: Is this actually what is returned when an entry is removed?
        'Comments can\'t be read after deletion',
    );

    // TODO: Do deleted entries show up here?

    t.deepEqual(
        alice.call('comments', 'main', 'comments_from_address', {
            address: postAddress,
        }),
        ['QmegNB3W4NsKC2BHzRd1DVTxLxNwLBtaVgEyFHXKsMjsVE'],
        'Comments can be retrieved from the address of a post',
    );

    t.deepEqual(
        alice.call('comments', 'main', 'comments_from_address', {
            // TODO: Should this be the address of the updated post?
            address: commentAddress,
        }),
        ['QmRs4WaAzHpuvRrVcN2SfFQx8hJ9Sqmmfb8fPVkimrwAJX'],
        'Comments can be retrieved from the address of a comment',
    );

    t.end();
});
