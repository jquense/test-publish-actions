const core = require("@actions/core");
const path = require("path");
const github = require("@actions/github");
const execa = require("execa");

async function run() {
  try {
    
    const resp = await execa("yarn", ["-s", "lerna", "changed", "--json"], {
      cwd: path.resolve(__dirname, "../../../")
    });
    
    const changed = JSON.parse(resp.stdout || "[]");
    
    const token = core.getInput("token", { required: true });
    const sha = github.context.sha;

    const client = new github.GitHub(token);

    core.debug(`tagging #${sha} with tag ${tag}`);

    const tags = changed.map(({ name, version }) => `${name}@${version}`);
    console.log(tags);
    await Promise.all(
      tags.flatMap(tag => [
        client.git.createRef({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          ref: `refs/tags/${tag}`,
          sha: sha
        }),
        client.git.createTag({
          tag,
          message: tag,
          type: "commit",
          object: sha,
          owner: github.context.repo.owner,
          repo: github.context.repo.repo
        })
      ])
    );
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
