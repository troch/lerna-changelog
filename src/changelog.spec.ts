jest.mock("../src/progress-bar");
jest.mock("../src/api-data-cache");
jest.mock("../src/changelog");
jest.mock("../src/github-api");
jest.mock("./git");

describe("Changelog", () => {
  describe("contructor", () => {
    const MockedChangelog = require("./changelog").default;

    beforeEach(() => {
      require("./changelog").__resetDefaults();
    });

    it("set config", () => {
      const testConfig = require("./changelog").__getConfig();

      const changelog = new MockedChangelog();
      expect(changelog.config).toEqual(testConfig);
    });

    it("set remote", () => {
      const changelog = new MockedChangelog();
      expect(changelog.remote).toBeDefined();
    });

    it("set cli options", () => {
      const changelog = new MockedChangelog({ "tag-from": "1", "tag-to": "2" });
      expect(changelog.tagFrom).toBe("1");
      expect(changelog.tagTo).toBe("2");
    });
  });

  describe("getCommitInfos", () => {
    beforeEach(() => {
      require("./api-data-cache").__resetDefaults();

      require("./git").listCommits.mockImplementation(() => [
        { sha: "a0000005", refName:"HEAD -> master, tag: v0.2.0, origin/master, origin/HEAD", summary: "chore(release): releasing component", date: "2017-01-01" },
        { sha: "a0000004", refName:"", summary: "Merge pull request #2 from my-feature", date: "2017-01-01" },
        { sha: "a0000003", refName:"", summary: "feat(module) Add new module (#2)", date: "2017-01-01" },
        { sha: "a0000002", refName:"", summary: "refactor(module) Simplify implementation", date: "2017-01-01" },
        { sha: "a0000001", refName:"tag: v0.1.0", summary: "chore(release): releasing component", date: "2017-01-01" },
      ]);

      require("./git").listTagNames.mockImplementation(() => [
        "v0.2.0",
        "v0.1.1",
        "v0.1.0",
        "v0.0.1",
      ]);

      require("./git").changedPaths.mockImplementation(() => []);

      const usersCache = {
        "test-user": {
          login: "test-user",
          html_url: "https://github.com/test-user",
          name: "Test User"
        },
      };
      const issuesCache = {
        2: {
          number: 2,
          title: "This is the commit title for the issue (#2)",
          labels: [
            { name: "Type: New Feature" },
            { name: "Status: In Progress" },
          ],
          user: usersCache["test-user"],
        }
      };
      require("./api-data-cache").__setCache({
        users: usersCache,
        "repos/lerna/lerna-changelog/issues": issuesCache,
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it("parse commits with different tags", async () => {
      const MockedChangelog = require("./changelog").default;
      const changelog = new MockedChangelog();
      const commitsInfo = await changelog.getCommitInfos();

      expect(commitsInfo).toMatchSnapshot();
    });
  });

  describe("getCommitters", () => {
    beforeEach(() => {
      require("./api-data-cache").__resetDefaults();

      const usersCache = {
        "test-user": {
          login: "test-user",
          html_url: "https://github.com/test-user",
          name: "Test User"
        },
        "test-user-1": {
          login: "test-user-1",
          html_url: "https://github.com/test-user-1",
          name: "Test User 1"
        },
        "test-user-2": {
          login: "test-user-2",
          html_url: "https://github.com/test-user-2",
          name: "Test User 2"
        },
        "user-bot": {
          login: "user-bot",
          html_url: "https://github.com/user-bot",
          name: "User Bot"
        },
      };
      require("./api-data-cache").__setCache({
        users: usersCache,
        "repos/lerna/lerna-changelog/issues": {},
      });
      require("./changelog").__setConfig({ ignoreCommitters: ["user-bot"] });
    });

    it("get list of valid commiters", async () => {
      const MockedChangelog = require("./changelog").default;
      const changelog = new MockedChangelog();

      const testCommits = [
        { commitSHA: "a0000004", githubIssue: { user: { login: "test-user-1" } } },
        { commitSHA: "a0000003", githubIssue: { user: { login: "test-user-2" } } },
        { commitSHA: "a0000002", githubIssue: { user: { login: "user-bot" } } },
        { commitSHA: "a0000001" },
      ];
      const committers = await changelog.getCommitters(testCommits);

      expect(committers).toEqual([{
        login: "test-user-1",
        html_url: "https://github.com/test-user-1",
        name: "Test User 1"
      }, {
        login: "test-user-2",
        html_url: "https://github.com/test-user-2",
        name: "Test User 2"
      }]);
    });
  });
});
