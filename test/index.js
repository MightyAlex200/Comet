// This test file uses the tape testing framework.
// To learn more, go here: https://github.com/substack/tape
const { Diorama, tapeExecutor } = require('@holochain/diorama');
const path = require('path');

const dnaPath = path.join(__dirname, '../dist/Comet.dna.json');
const dna = Diorama.dna(dnaPath, 'comet');
const diorama = new Diorama({
    instances: {
        alice: dna
    },
    debugLog: false,
    executor: tapeExecutor(require('tape')),
});

// Constants for testing
const testAnchor = { anchor_type: 'type', anchor_text: 'text' };
let anchorAddress;
let testPost;

diorama.registerScenario('Test votes zome', async (s, t, { alice }) => {
    const postAddress = await alice.call('posts', 'create_post', {
        post: {
            title: 'Testing post',
            content: 'This post is used for testing the votes zome',
            utc_unix_time: 0,
        },
        tags: [0],
    });

    const commentAddress = await alice.call('comments', 'create_comment', {
        comment: {
            content: 'This comment is used for testing the votes zome',
            utc_unix_time: 0,
        },
        target: postAddress.Ok,
    });

    await s.consistent();

    /// GETTING VOTES ///
    // NEGATIVE - Invalid post //
    // ON POST //
    t.deepEquals(
        await alice.call('votes', 'votes_from_address', {
            address: postAddress.Ok,
        }),
        { Ok: [] },
        'Getting votes of unvoted on post returns the empty list',
    );
    // ON COMMENT //
    t.deepEquals(
        await alice.call('votes', 'votes_from_address', {
            address: commentAddress.Ok,
        }),
        { Ok: [] },
        'Getting votes of unvoted on comment returns the empty list',
    );

    /// VOTING ///
    // NEGATIVE - Invalid fraction //
    // ON POST //
    t.deepEquals(
        JSON.parse((await alice.call('votes', 'vote', {
            fraction: 1000,
            in_terms_of: [1],
            utc_unix_time: 0,
            target: postAddress.Ok,
        })).Err.Internal).kind,
        { ValidationFailed: 'Vote fraction must be between 1 and -1' },
        'Cannot vote on post with invalid fraction',
    );

    // ON COMMENT //
    t.deepEquals(
        JSON.parse((await alice.call('votes', 'vote', {
            fraction: 1000,
            in_terms_of: [1],
            utc_unix_time: 0,
            target: commentAddress.Ok,
        })).Err.Internal).kind,
        { ValidationFailed: 'Vote fraction must be between 1 and -1' },
        'Cannot vote on comment with invalid fraction',
    );
    // NEGATIVE - Invalid target //
    t.deepEquals(
        (await alice.call('votes', 'vote', {
            fraction: 1,
            in_terms_of: [1],
            utc_unix_time: 0,
            target: "invalid",
        })).Err.Internal,
        'Vote target was not app entry.',
        'Cannot vote on invalid target',
    );

    // POSITIVE //
    // ON POST //
    t.deepEquals(
        await alice.call('votes', 'vote', {
            fraction: 1,
            in_terms_of: [1],
            utc_unix_time: 0,
            target: postAddress.Ok,
        }),
        { Ok: 'Qmedhx72FQQZorSNZpNxUBoiYttmKqdakyT9vCS2h8pXFS' },
        'Can vote on posts',
    );

    // ON COMMENT //
    t.deepEquals(
        await alice.call('votes', 'vote', {
            fraction: 1,
            in_terms_of: [1],
            utc_unix_time: 0,
            target: commentAddress.Ok,
        }),
        { Ok: 'QmSXAFbsqUEyjABf1H1x1CvfM4eAyVwS1AX1d1w9nKMypY' },
        'Can vote on comments',
    );

    await s.consistent();

    /// REVOTING ///
    // POSITIVE //
    // ON POST //
    t.deepEquals(
        await alice.call('votes', 'vote', {
            fraction: 0.5,
            in_terms_of: [1],
            utc_unix_time: 1,
            target: postAddress.Ok,
        }),
        { Ok: 'QmR1WyyzsELNnftDUAc5DH9GASfLnVWFNN1wH2CCirupqY' },
        'Can revote on posts',
    );

    // ON COMMENT //
    t.deepEquals(
        await alice.call('votes', 'vote', {
            fraction: 0.5,
            in_terms_of: [1],
            utc_unix_time: 1,
            target: commentAddress.Ok,
        }),
        { Ok: 'QmddykFErZ3Qs86Afj2TLZjDm6RFVmYrfRMiineDgp4qUo' },
        'Can revote on comments',
    );

    // NEGATIVE - Invalid fraction //
    // ON POST //
    t.deepEquals(
        JSON.parse((await alice.call('votes', 'vote', {
            fraction: 5,
            in_terms_of: [1],
            utc_unix_time: 1,
            target: postAddress.Ok,
        })).Err.Internal).kind,
        { ValidationFailed: 'Vote fraction must be between 1 and -1' },
        'Cannot recast invalid vote on posts',
    );

    // ON COMMENT //
    t.deepEquals(
        JSON.parse((await alice.call('votes', 'vote', {
            fraction: 5,
            in_terms_of: [1],
            utc_unix_time: 1,
            target: commentAddress.Ok,
        })).Err.Internal).kind,
        { ValidationFailed: 'Vote fraction must be between 1 and -1' },
        'Cannot recast invalid vote on comments',
    );

    await s.consistent();

    /// GETTING VOTES ///
    // POSITIVE //
    // ON POST //
    t.deepEquals(
        await alice.call('votes', 'votes_from_address', {
            address: postAddress.Ok,
        }),
        {
            Ok: [{
                fraction: 0.5,
                in_terms_of: [1],
                target_hash: postAddress.Ok,
                key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
                timestamp: '1970-01-01T00:00:01+00:00',
            }]
        },
        'Can get votes from post',
    );

    // ON COMMENT //
    t.deepEquals(
        await alice.call('votes', 'votes_from_address', {
            address: commentAddress.Ok,
        }),
        {
            Ok: [{
                fraction: 0.5,
                in_terms_of: [1],
                target_hash: commentAddress.Ok,
                key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
                timestamp: '1970-01-01T00:00:01+00:00',
            }]
        },
        'Can get votes from post',
    );
});

diorama.registerScenario('Test anchors zome', async (s, t, { alice }) => {
    /// ANCHORING ///
    anchorAddress = await alice.call('anchors', 'anchor', { anchor: testAnchor });
    t.deepEquals(anchorAddress, { Ok: 'QmaSQL21LjUj67aieoVyzwyUj36kbuCCsAyuScX5kXFMdB' }, 'Address is correct')

    await s.consistent();

    /// ANCHORS EXIST ///
    // POSITIVE //
    t.deepEquals(
        await alice.call('anchors', 'exists', {
            anchor_address: anchorAddress.Ok
        }),
        { Ok: true },
        'Anchor exists'
    )

    // NEGATIVE //
    t.deepEquals(
        await alice.call('anchors', 'exists', {
            anchor_address: 'Garbage address'
        }),
        { Ok: false },
        'Anchors not created do not exist'
    );

    /// ANCHORS ///
    // POSITIVE //
    t.deepEquals(
        await alice.call('anchors', 'anchors', {
            anchor_type: 'type'
        }),
        { Ok: { links: [{ address: anchorAddress.Ok, headers: [], tag: '', status: 'live' }] } },
        "Exactly 1 anchor with type 'type'"
    );

    // NEGATIVE //
    t.deepEquals(
        await alice.call('anchors', 'anchors', {
            anchor_type: 'unused type'
        }),
        { Ok: { links: [] } },
        "No anchor with the type 'unused type'"
    );
});

diorama.registerScenario('Test posts zome', async (s, t, { alice }) => {
    const testPostEntry = {
        title: 'This is a test post',
        content: 'This is the content of the post',
        utc_unix_time: 0,
    };

    /// GET USERNAME ///
    // POSITIVE //
    t.deepEquals(
        await alice.call('posts', 'get_username', {
            agent_address: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
        }),
        { Ok: 'alice' },
        'Can get usernames of users',
    );

    // NEGATIVE //
    t.deepEquals(
        await alice.call('posts', 'get_username', {
            agent_address: 'invalid',
        }),
        { Err: { Internal: 'Address did not lead to agent id.' } },
        "Can't get usernames of non-users",
    );

    /// USER POSTS ///
    // NEGATIVE //
    t.deepEquals(
        await alice.call('posts', 'user_posts', {
            author: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui'
        }),
        { Ok: [] },
        'User has no posts attributed to them'
    );

    /// CREATING POSTS ///
    // POSITIVE //
    testPost = await alice.call('posts', 'create_post', {
        post: testPostEntry,
        tags: [1, 2],
    });

    t.deepEquals(testPost, { Ok: 'QmZznbVvtoWZ3PwsEKqJyRYRWpsW6kU5wpFsHWfCmX8xLk' }, 'Address is correct');

    // NEGATIVE //
    const invalidTestPostEntry = {
        ...testPostEntry,
        timestamp: '1970-01-01T00:00:00+00:00',
        key_hash: 'invalid',
    };

    await (async () => {
        const invalidPostResponse =
            await alice.call(
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
                JSON.parse(invalidPostResponse.Err.Internal).kind.ValidationFailed.startsWith('Cannot alter post that is not yours.'),
                'Cannot create post with invalid key hash',
            );
        }
    })();

    await s.consistent();

    /// USER POSTS ///
    // POSITIVE //
    t.deepEquals(
        await alice.call('posts', 'user_posts', {
            author: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui'
        }),
        { Ok: [testPost.Ok] },
        'Author has posts attributed to them'
    );

    /// POST TAGS ///
    // POSITIVE & NEGATIVE //
    await (async () => {
        const post_tags = await alice.call('posts', 'post_tags', {
            address: testPost.Ok,
        });
        const ok =
            post_tags.Ok &&
            post_tags.Ok.original_tags &&
            post_tags.Ok.crosspost_tags &&
            post_tags.Ok.original_tags.length == 2 &&
            post_tags.Ok.crosspost_tags.length == 0 &&
            post_tags.Ok.original_tags.includes(1) &&
            post_tags.Ok.original_tags.includes(2) &&
            !post_tags.Ok.original_tags.includes(3) &&
            !post_tags.Ok.original_tags.includes(4);
        t.ok(ok, 'Post tags are valid');
    })();

    /// SEARCH ///
    // POSITIVE & NEGATIVE //

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "exactly", values: 1 },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [1] }] },
        'Exactly query finds post'
    );

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "exactly", values: 5 },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Exactly query finds no post'
    );

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 1 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [1] }] },
        'Or query finds post'
    );

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "or", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 8 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Or query finds no post'
    );

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [2, 1] }] },
        'And query finds post'
    );

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "and", values: [{ type: "exactly", values: 0 }, { type: "exactly", values: 3 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'And query finds no post'
    );

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 2 }, { type: "exactly", values: 5 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [2] }] },
        'Not query finds post'
    );

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "not", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Not query finds no post'
    );

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 5 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [{ address: testPost.Ok, in_terms_of: [2] }] },
        'Xor query finds post'
    );

    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "xor", values: [{ type: "exactly", values: 1 }, { type: "exactly", values: 2 }] },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Xor query finds no post'
    );

    /// CROSSPOSTING ///
    // POSITIVE //
    t.deepEquals(
        await alice.call('posts', 'crosspost', {
            post_address: testPost.Ok,
            tags: [3, 4],
        }),
        { Ok: null },
        'Crossposting returns OK'
    );

    // NEGATIVE //
    t.deepEquals(
        await alice.call('posts', 'crosspost', {
            post_address: 'invalid',
            tags: [3, 4],
        }),
        {
            Err: {
                Internal:
                    '{"kind":{"ErrorGeneric":"Target for link not found"},"file":"core/src/nucleus/ribosome/runtime.rs","line":"225"}'
            }
        },
        'Cannot crosspost invalid target'
    );

    await s.consistent();

    /// SEARCH ///
    // POSITIVE //
    const searchResult = await alice.call('posts', 'search', {
        query: { type: 'and', values: [{ type: 'exactly', values: 3 }, { type: 'exactly', values: 4 }] },
        exclude_crossposts: false,
    });
    t.ok(
        searchResult.Ok &&
        searchResult.Ok.length == 1 &&
        searchResult.Ok[0] &&
        searchResult.Ok[0].address == testPost.Ok &&
        searchResult.Ok[0].in_terms_of &&
        searchResult.Ok[0].in_terms_of.length == 2 &&
        searchResult.Ok[0].in_terms_of.includes(3) &&
        searchResult.Ok[0].in_terms_of.includes(4),

        // { Ok: [{ address: testPost.Ok, in_terms_of: [3, 4] }] },
        'Crossposts can be found with search'
    );

    // NEGATIVE //
    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: 'and', values: [{ type: 'exactly', values: 3 }, { type: 'exactly', values: 4 }] },
            exclude_crossposts: true,
        }),
        { Ok: [] },
        'Crossposts can be excluded with search'
    );

    /// POST TAGS ///
    // POSITIVE //
    await (async () => {
        const post_tags = await alice.call('posts', 'post_tags', {
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

    /// READING POST ///
    // POSITIVE //
    t.deepEqual(
        (await alice.call('posts', 'read_post', {
            address: testPost.Ok,
        })).Ok,
        {
            title: 'This is a test post',
            content: 'This is the content of the post',
            key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
            timestamp: '1970-01-01T00:00:00+00:00'
        },
        'Posts are read correctly',
    );

    // NEGATIVE //
    t.deepEqual(
        await alice.call('posts', 'read_post', {
            address: 'invalid',
        }),
        { Err: { Internal: 'No entry at this address' } },
        'Cannot read invalid posts',
    );

    /// UPDATE POSTS ///
    // POSITIVE //
    const updatedTestPostEntry = { ...testPostEntry, content: 'Updated test post' };

    t.deepEqual(
        await alice.call('posts', 'update_post', {
            old_address: testPost.Ok,
            new_entry: updatedTestPostEntry,
        }),
        { Ok: 'QmZyKXyWQMt9J5MSDT31JXfkkeH4Z7m97NWjjS875TBco6' },
        'Posts can be updated',
    );

    // NEGATIVE //
    t.deepEqual(
        await alice.call('posts', 'update_post', {
            old_address: 'invalid',
            new_entry: updatedTestPostEntry,
        }),
        { Err: { Internal: 'Entry Could Not Be Found' } },
        'Invalid posts cannot be updated',
    );

    await s.consistent();

    /// READING POSTS ///
    // POSITIVE //
    t.deepEqual(
        (await alice.call('posts', 'read_post', {
            address: testPost.Ok,
        })).Ok,
        {
            title: 'This is a test post',
            content: 'Updated test post',
            key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
            timestamp: '1970-01-01T00:00:00+00:00'
        },
        'Updated posts are read correctly'
    );

    /// DELETING POSTS ///
    // POSITIVE //
    t.deepEqual(
        await alice.call('posts', 'delete_post', {
            address: testPost.Ok
        }),
        { Ok: 'QmPRd5wyHCNvuQsHAR9PgYgRj4UhGQraToDf1dQUgBLyNn' },
        'Posts can be deleted',
    );

    await s.consistent();

    /// READING POSTS ///
    // NEGATIVE //
    t.deepEqual(
        await alice.call('posts', 'read_post', {
            address: testPost.Ok
        }),
        { Err: { Internal: 'No entry at this address' } },
        'Posts can\'t be read after deletion',
    );

    /// SEARCH ///
    // NEGATIVE //
    t.deepEquals(
        await alice.call('posts', 'search', {
            query: { type: "exactly", values: 1 },
            exclude_crossposts: false,
        }),
        { Ok: [] },
        'Query finds no post after deletion'
    );

    /// AGENT ADDRESS ///
    t.equal(
        await alice.call('posts', 'get_agent_address', {}),
        'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
        'Agent address can be retrieved',
    );
});

diorama.registerScenario('Test comments zome', async (s, t, { alice }) => {
    const postAddress = await alice.call('posts', 'create_post', {
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

    const commentAddress = await alice.call('comments', 'create_comment', {
        comment: commentEntry,
        target: postAddress.Ok,
    });

    await s.consistent();

    const otherCommentAddress = await alice.call('comments', 'create_comment', {
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
        (await alice.call('comments', 'read_comment', {
            address: commentAddress.Ok,
        })).Ok,
        {
            content: 'This is a comment!',
            key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
            timestamp: '1970-01-01T00:00:00+00:00'
        },
        'Comments are read correctly'
    );

    const updatedCommentEntry = { ...commentEntry, content: 'This is an updated comment.' };

    const updatedCommentAddress = await alice.call('comments', 'update_comment', {
        old_address: commentAddress.Ok,
        new_entry: updatedCommentEntry,
    });

    t.deepEqual(
        updatedCommentAddress,
        { Ok: 'Qma4WG8UZjqnroMnUxbmxEyUgaKgvVAZqkwGWaeYNAHzpc' },
        'Comments can be updated',
    );

    await s.consistent();

    t.deepEqual(
        (await alice.call('comments', 'read_comment', {
            address: commentAddress.Ok,
        })).Ok,
        {
            content: 'This is an updated comment.',
            key_hash: 'HcScjwO9ji9633ZYxa6IYubHJHW6ctfoufv5eq4F7ZOxay8wR76FP4xeG9pY3ui',
            timestamp: '1970-01-01T00:00:00+00:00'
        }
        , 'Updated comments are read correctly'
    );

    t.deepEqual(
        await alice.call('comments', 'comments_from_address', {
            address: postAddress.Ok,
        }),
        { Ok: [commentAddress.Ok] },
        'Comments can be retrieved from the address of a post',
    );

    t.deepEqual(
        await alice.call('comments', 'comments_from_address', {
            address: commentAddress.Ok,
        }),
        { Ok: [otherCommentAddress.Ok] },
        'Comments can be retrieved from the address of a comment',
    );

    await s.consistent();

    t.deepEqual(
        await alice.call('comments', 'delete_comment', {
            address: otherCommentAddress.Ok
        }),
        { Ok: 'QmWZHszfNJSdC4knQtRVqLPCtrTx2iRJ8d83N6srB8TeLX' },
        'Comments can be deleted',
    );

    await s.consistent();

    t.deepEqual(
        await alice.call('comments', 'read_comment', {
            address: otherCommentAddress.Ok
        }),
        { Err: { Internal: 'No entry at this address' } },
        'Comments can\'t be read after deletion',
    );

    t.deepEqual(
        await alice.call('comments', 'comments_from_address', {
            address: commentAddress.Ok,
        }),
        { Ok: [] },
        'Deleted Comments can\'t be retrieved from the address of a comment',
    );

    t.deepEqual(
        await alice.call('comments', 'delete_comment', {
            address: commentAddress.Ok
        }),
        { Ok: 'QmZBTscKSa7AteGEcKaCSgkC1ZVYHKDfgJLxR3BxRobQNe' },
        'Comments can be deleted',
    );

    await s.consistent();

    t.deepEqual(
        await alice.call('comments', 'read_comment', {
            address: commentAddress.Ok
        }),
        { Err: { Internal: 'No entry at this address' } },
        'Comments can\'t be read after deletion',
    );

    t.deepEqual(
        await alice.call('comments', 'comments_from_address', {
            address: postAddress.Ok,
        }),
        { Ok: [] },
        'Deleted comments can\'t be retrieved from the address of a post',
    );
});

diorama.run();
