import { Octokit } from '@octokit/rest';
import { seckeySigner } from '@rx-nostr/crypto';
import { createRxNostr, noopVerifier } from 'rx-nostr';

export default {
	async scheduled(controller, env, ctx): Promise<void> {
		if (!env.NOSTR_NSEC) {
			console.error('NOSTR_NSEC is empty.');
			return;
		}

		const relays = env.RELAYS?.split('\n').map((relay) => relay.trim()) ?? [];
		if (relays.length === 0) {
			console.error('RELAYS are empty.');
			return;
		}

		const rxNostr = createRxNostr({ verifier: noopVerifier, signer: seckeySigner(env.NOSTR_NSEC), authenticator: 'auto' });
		rxNostr.addDefaultRelays(relays);

		const octokit = env.GITHUB_TOKEN ? new Octokit({ auth: env.GITHUB_TOKEN }) : new Octokit();

		const lastPushedAt = await env.KV.get('pushed_at');

		const search = await octokit.search.repos({
			q: `topic:nostr${lastPushedAt ? ` pushed:>${lastPushedAt}` : ''}`,
			sort: 'updated',
			order: 'desc',
			per_page: lastPushedAt ? 100 : 5,
		});

		const repositories = search.data.items;
		if (repositories.length === 0) {
			return;
		}

		const pushedAt = repositories[0].pushed_at;
		await env.KV.put('pushed_at', pushedAt);

		for (const repository of repositories.reverse()) {
			const commit = await octokit.repos.getCommit({
				owner: repository.owner?.login ?? '',
				repo: repository.name,
				ref: repository.default_branch,
			});

			if (commit.data.author?.type.toLowerCase() === 'bot') {
				continue;
			}

			const message = commit.data.commit.message.split('\n').slice(0, 10).join('\n');
			const content = `[ ${repository.full_name} ] ${message}\n${commit.data.html_url}`;
			const tags = [['proxy', commit.data.html_url, 'web']];

			const { promise, resolve } = Promise.withResolvers<void>();
			rxNostr.send({ kind: 1, content, tags }).subscribe({ complete: () => resolve() });
			await promise;
		}
	},
} satisfies ExportedHandler<Env>;
