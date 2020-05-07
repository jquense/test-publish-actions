const path = require("path");
const core = require("@actions/core");
const github = require("@actions/github");
const execa = require("execa");

async function run() {
  try {
    const resp = await execa("yarn", ["-s", "lerna", "changed", "--json"], {
      cwd: path.resolve(__dirname, "../../../"),
      reject: false,
    });

    if (resp.failed) {
      core.setFailed(resp.stderr);
      return;
    }

    const changed = JSON.parse(resp.stdout || "[]");

    const token = core.getInput("token", { required: true });
    const sha = github.context.sha;

    const client = new github.GitHub(token);

    const tags = changed.map(({ name, version }) => `${name}@${version}`);

    if (!tags.length) {
      core.info("No changes need to be tagged");
      return;
    }

    core.info(`tagging #${sha} with tag ${tags.join(", ")}`);

    await Promise.all(
      tags.map(async (tag) => {
        const tagObj = await client.git.createTag({
          tag,
          message: tag,
          type: "commit",
          object: sha,
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
        });
        return client.git.createRef({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          ref: `refs/tags/${tag}`,
          sha: tagObj.data.sha,
        });
      })
    );
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
