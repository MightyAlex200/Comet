// This test file uses the tape testing framework.
// To learn more, go here: https://github.com/substack/tape
const { Config, Scenario } = require("@holochain/holochain-nodejs");
Scenario.setTape(require("tape"));

const dnaPath = "./dist/Comet.dna.json"
const agentAlice = Config.agent("alice");
const dna = Config.dna(dnaPath);
const instanceAlice = Config.instance(agentAlice, dna);
const scenario = new Scenario([instanceAlice]);

// Constants for testing
const testAnchor = { anchor_type: 'type', anchor_text: 'text' };
let anchorAddress;
let testPost;

scenario.runTape('Test anchors zome', async (t, { alice }) => {
    anchorAddress = alice.call('anchors', 'anchor', { anchor: testAnchor });
    t.deepEquals(anchorAddress, { Ok: 'QmaSQL21LjUj67aieoVyzwyUj36kbuCCsAyuScX5kXFMdB' }, 'Address is correct')

    t.deepEquals(
        alice.call('anchors', 'exists', {
            anchor_address: anchorAddress.Ok
        }),
        { Ok: true },
        'Anchor exists'
    )

    t.deepEquals(
        alice.call('anchors', 'exists', {
            anchor_address: 'Garbage address'
        }),
        { Ok: false },
        'Anchors not created do not exist'
    );

    t.deepEquals(
        alice.call('anchors', 'anchors', {
            anchor_type: 'type'
        }),
        { Ok: { addresses: [anchorAddress.Ok] } },
        "Exactly 1 anchor with type 'type'"
    );

    t.deepEquals(
        alice.call('anchors', 'anchors', {
            anchor_type: 'unused type'
        }),
        { Ok: { addresses: [] } },
        "No anchor with the type 'unused type'"
    );
});

scenario.runTape('Test posts zome', async (t, { alice }) => {
    const testPostEntry = {
        title: 'This is a test post',
        content: 'This is the content of the post',
        utc_unix_time: 0,
    };

    testPost = alice.call('posts', 'create_post', {
        post: testPostEntry,
        tags: [1, 2],
    });

    t.deepEquals(testPost, { Ok: 'QmZznbVvtoWZ3PwsEKqJyRYRWpsW6kU5wpFsHWfCmX8xLk' }, 'Address is correct');

    const invalidTestPostEntry = {
        ...testPostEntry,
        timestamp: '1970-01-01T00:00:00+00:00',
        key_hash: 'invalid',
    };

    (() => {
        const invalidPostResponse =
            alice.call(
                'posts',
                'create_post_raw',
                { post: invalidTestPostEntry, tags: [1, 2] },
            );
        const ok =
            invalidPostResponse
            && invalidPostResponse.Err
            && invalidPostResponse.Err.Internal;
        t.ok(ok);
        if (ok) {
            t.ok(
                JSON.parse(invalidPostResponse.Err.Internal).kind.ValidationFailed.startsWith('Cannot alter post that is not yours. Your agent address is '),
                'Cannot create post with invalid key hash',
            );
        }
    })();

    t.deepEquals(
        alice.call('posts', 'user_posts', {
            author: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui'
        }),
        { Ok: { addresses: [testPost.Ok] } },
        'Author has posts attributed to them'
    );

    (() => {
        const post_tags = alice.call('posts', 'post_tags', {
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
        alice.call('posts', 'search', {
            query: { type: "exactly", values: 1 },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [1] }] },
        'Exactly query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: "exactly", values: 5 },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Exactly query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 1 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [1] }] },
        'Or query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 8 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Or query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [1, 2] }] },
        'And query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 0 }, { type: "exactly", values: 3 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'And query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 2 }, { type: "exactly", values: 5 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [2] }] },
        'Not query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Not query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [2] }] },
        'Xor query finds post'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Xor query finds no post'
    );

    t.deepEquals(
        alice.call('posts', 'crosspost', {
            post_address: testPost.Ok,
            tags: [3, 4],
        }),
        { Ok: null },
        'Crossposting returns OK'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: 'and', values: [{ type: 'exactly', values: 3 }, { type: 'exactly', values: 4 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [3, 4] }] },
        'Crossposts can be found with search'
    );

    t.deepEquals(
        alice.call('posts', 'search', {
            query: { type: 'and', values: [{ type: 'exactly', values: 3 }, { type: 'exactly', values: 4 }] },
            exclude_crossposts: true,
        }),
        { Ok: [] },
        'Crossposts can be excluded with search'
    );

    (() => {
        const post_tags = alice.call('posts', 'post_tags', {
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

    t.deepEqual(
        alice.call('posts', 'read_post', {
            address: testPost.Ok,
        }).Ok,
        {
            title: 'This is a test post',
            content: 'This is the content of the post',
            key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
            timestamp: '1970-01-01T00:00:00+00:00'
        },
        'Posts are read correctly',
    );

    const updatedTestPostEntry = { ...testPostEntry, content: 'Updated test post' };

    t.deepEqual(
        alice.call('posts', 'update_post', {
            old_address: testPost.Ok,
            new_entry: updatedTestPostEntry,
        }),
        { Ok: 'QmZyKXyWQMt9J5MSDT31JXfkkeH4Z7m97NWjjS875TBco6' },
        'Posts can be updated',
    );

    t.deepEqual(
        alice.call('posts', 'read_post', {
            address: testPost.Ok,
        }).Ok,
        {
            title: 'This is a test post',
            content: 'Updated test post',
            key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
            timestamp: '1970-01-01T00:00:00+00:00'
        },
        'Updated posts are read correctly'
    );

    t.deepEqual(
        alice.call('posts', 'delete_post', {
            address: testPost.Ok
        }),
        { Ok: null },
        'Posts can be deleted',
    );

    t.deepEqual(
        alice.call('posts', 'read_post', {
            address: testPost.Ok
        }),
        { Ok: null },
        'Posts can\'t be read after deletion',
    );
});

scenario.runTape('Test comments zome', async (t, { alice }) => {
    const postAddress = alice.call('posts', 'create_post', {
        post: {
            title: 'Testing post',
            content: 'This post is used for testing the comments zome',
            utc_unix_time: 0,
        },
        tags: [0]
    });

    const commentEntry = {
        content: 'This is a comment!',
        utc_unix_time: 0,
    };

    const otherCommentEntry = {
        content: 'This is another comment!',
        utc_unix_time: 0,
    };

    const commentAddress = alice.call('comments', 'create_comment', {
        comment: commentEntry,
        target: postAddress.Ok,
    });

    const otherCommentAddress = alice.call('comments', 'create_comment', {
        comment: otherCommentEntry,
        target: commentAddress.Ok,
    });

    t.deepEquals(
        commentAddress,
        { Ok: 'QmeAjLTzh2tV8T7jeAGgCo41S1zpHwbzBfbH52mTzAZ1Ws' },
        'Address is correct, comments can be made on posts'
    );

    t.deepEquals(
        otherCommentAddress,
        { Ok: 'QmP8zSSeTCj7NpfbMqUuSkFDxSZjVhkWhrwcqHvwKqUBdv' },
        'Address is correct, comments can be made on other comments'
    );

    t.deepEqual(
        alice.call('comments', 'read_comment', {
            address: commentAddress.Ok,
        }).Ok,
        {
            content: 'This is a comment!',
            key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
            timestamp: '1970-01-01T00:00:00+00:00'
        },
        'Comments are read correctly'
    );

    const updatedCommentEntry = { ...commentEntry, content: 'This is an updated comment.' };

    const updatedCommentAddress = alice.call('comments', 'update_comment', {
        old_address: commentAddress.Ok,
        new_entry: updatedCommentEntry,
    });

    t.deepEqual(
        updatedCommentAddress,
        { Ok: 'Qma4WG8UZjqnroMnUxbmxEyUgaKgvVAZqkwGWaeYNAHzpc' },
        'Comments can be updated',
    );

    t.deepEqual(
        alice.call('comments', 'read_comment', {
            address: commentAddress.Ok,
        }).Ok,
        {
            content: 'This is an updated comment.',
            key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
            timestamp: '1970-01-01T00:00:00+00:00'
        }
        , 'Updated comments are read correctly'
    );

    t.deepEqual(
        alice.call('comments', 'delete_comment', {
            address: commentAddress.Ok
        }),
        { Ok: null },
        'Comments can be deleted',
    );

    t.deepEqual(
        alice.call('comments', 'read_comment', {
            address: commentAddress.Ok
        }),
        { Ok: null },
        'Comments can\'t be read after deletion',
    );

    t.deepEqual(
        alice.call('comments', 'comments_from_address', {
            address: postAddress.Ok,
        }),
        { Ok: [commentAddress.Ok] },
        'Comments can be retrieved from the address of a post',
    );

    t.deepEqual(
        alice.call('comments', 'comments_from_address', {
            address: commentAddress.Ok,
        }),
        { Ok: [otherCommentAddress.Ok] },
        'Comments can be retrieved from the address of a comment',
    );
});
