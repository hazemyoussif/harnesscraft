import test from "node:test";
import assert from "node:assert/strict";
import { detectRisk } from "../extensions/pi/safety-gates.ts";

const gated = [
  ["git push --force origin main", "Force push"],
  ["git push -f", "Force push"],
  ["git push --force-with-lease origin feature", "Force push"],
  ["git push origin +main", "Force push"],
  ["git push origin --delete feature", "Remote ref deletion"],
  ["git push origin '+main'", "Force push"],
  ["git -C ../app push --force", "Force push"],
  ["git -c core.editor=vim --no-pager push -f origin main", "Force push"],
  ["git push origin :feature", "Remote ref deletion"],
  ["git -C ../app reset --hard", "Hard reset"],
  ["git switch --discard-changes main", "Discard uncommitted changes"],
  ["git switch -f main", "Discard uncommitted changes"],
  ["git checkout src/app.ts", "Discard uncommitted changes"],
  ["git checkout HEAD~1 src", "Discard uncommitted changes"],
  ["git checkout '*.ts'", "Discard uncommitted changes"],
  ["git reset --hard HEAD~1", "Hard reset"],
  ["git clean -fd", "Destructive Git clean"],
  ["git checkout -- .", "Discard uncommitted changes"],
  ["git checkout .", "Discard uncommitted changes"],
  ["git restore src/app.ts", "Discard uncommitted changes"],
  ["git restore --staged --worktree src/app.ts", "Discard uncommitted changes"],
  ["git restore --staged src/app.ts && git restore src/app.ts", "Discard uncommitted changes"],
  ["git stash clear", "Stash deletion"],
  ["git stash drop stash@{0}", "Stash deletion"],
  ["git branch -D feature", "Forced branch deletion"],
  ["git branch --delete --force feature", "Forced branch deletion"],
  ["git branch -df feature", "Forced branch deletion"],
  ["git branch -fd feature", "Forced branch deletion"],
  ["git merge feature", "Git merge"],
  ["git rebase main", "Git rebase"],
  ["git pull --rebase", "Git rebase"],
  ["gh pr merge 12 --merge", "Pull-request merge"],
  ["rm -rf build", "Recursive forced deletion"],
  ["rm -fr build", "Recursive forced deletion"],
  ["rm -f -r build", "Recursive forced deletion"],
  ["rm -R -f build", "Recursive forced deletion"],
  ["rm --recursive --force build", "Recursive forced deletion"],
  ["cd /tmp && rm -fr cache", "Recursive forced deletion"],
  ["/bin/rm -rf build", "Recursive forced deletion"],
  ["\\rm -rf build", "Recursive forced deletion"],
  ["sudo /usr/bin/rm -rf /var/cache/app", "Recursive forced deletion"],
  ["psql -c 'DROP TABLE users'", "Destructive database operation"],
  ["bin/rails db:drop", "Destructive database operation"],
  ["bin/rails db:reset", "Destructive database operation"],
  ["psql -c 'DELETE FROM users;'", "Destructive database operation"],
  ["psql -c 'TRUNCATE users;'", "Destructive database operation"],
  ["psql -c 'truncate orders, items cascade'", "Destructive database operation"],
  ["bin/rails db:truncate_all", "Destructive database operation"],
  ["bin/rails db:seed:replant", "Destructive database operation"],
  ["npx prisma migrate reset", "Destructive database operation"],
  ["terraform destroy", "Infrastructure destroy"],
  ["kubectl delete namespace staging", "Kubernetes namespace deletion"],
  ["npm publish", "Package publish"],
  ["docker system prune -a", "Docker destructive prune"],
  ["docker system prune -af", "Docker destructive prune"],
];

const allowed = [
  "git push origin main",
  "git push -u origin feature",
  "git push --follow-tags",
  "git push origin main && rm -f notes.txt",
  "git checkout main",
  "git checkout -b feature",
  "git checkout -b feature origin/feature",
  "git checkout feature/login",
  "git checkout v1.2.3",
  "git switch main",
  "git switch -c feature",
  "git -C ../app status",
  "git -C ../app push origin main",
  "git clean -n && rm -f notes.txt",
  "truncate -s 0 app.log",
  "git commit -m 'truncate long titles in cards'",
  "git restore --staged src/app.ts",
  "git stash list",
  "git branch -d feature",
  "git branch -f main origin/main",
  "git merge --abort",
  "git merge-base main HEAD",
  "git rebase --abort",
  "git pull",
  "git pull --rebase=false",
  "rm -r config",
  "rm -f notes.txt",
  "rm -- -rf",
  "bin/rails db:migrate",
  "psql -c 'DELETE FROM users WHERE id = 1;'",
  "psql <<'SQL'\nDELETE FROM users\nWHERE id = 1;\nSQL",
  "kubectl delete pod web-1",
  "docker system prune",
];

test("safety gate flags each consequential command with its label", () => {
  for (const [command, label] of gated) {
    assert.equal(detectRisk(command)?.label, label, command);
  }
});

test("safety gate lets everyday commands through", () => {
  for (const command of allowed) {
    assert.equal(detectRisk(command), null, command);
  }
});
