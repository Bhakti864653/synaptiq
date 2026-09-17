"""Shared fakes for testing backend endpoints without a real Supabase
project. Deliberately minimal - only the query shapes this app's own code
actually uses (select/eq/in_/order/maybe_single/insert/update/delete plus
storage.from_().download()/remove() and auth.get_user()), not a general
Supabase client mock."""

from types import SimpleNamespace


class FakeQuery:
    def __init__(self, store: dict[str, list[dict]], name: str):
        self._store = store
        self._name = name
        self._filters: dict = {}
        self._in_filters: dict = {}
        self._single = False
        self._order_by: tuple[str, bool] | None = None
        self._pending: tuple[str, object] | None = None
        self._result = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def in_(self, column, values):
        self._in_filters[column] = set(values)
        return self

    def order(self, column, desc=False):
        self._order_by = (column, desc)
        return self

    def maybe_single(self):
        self._single = True
        return self

    def insert(self, rows):
        self._pending = ("insert", rows if isinstance(rows, list) else [rows])
        return self

    def update(self, patch):
        self._pending = ("update", patch)
        return self

    def delete(self):
        self._pending = ("delete", None)
        return self

    def _matches(self, row: dict) -> bool:
        for key, value in self._filters.items():
            if row.get(key) != value:
                return False
        for key, values in self._in_filters.items():
            if row.get(key) not in values:
                return False
        return True

    def execute(self):
        rows = self._store.setdefault(self._name, [])

        if self._pending:
            kind, payload = self._pending
            if kind == "insert":
                new_rows = []
                for i, item in enumerate(payload):
                    row = dict(item)
                    row.setdefault("id", f"{self._name}-{len(rows) + i + 1}")
                    new_rows.append(row)
                rows.extend(new_rows)
                self._result = new_rows
            elif kind == "update":
                matched = [r for r in rows if self._matches(r)]
                for r in matched:
                    r.update(payload)
                self._result = matched
            else:  # delete
                matched = [r for r in rows if self._matches(r)]
                self._store[self._name] = [r for r in rows if r not in matched]
                self._result = matched
            return self

        matched = [r for r in rows if self._matches(r)]
        if self._order_by:
            column, desc = self._order_by
            matched = sorted(matched, key=lambda r: r.get(column), reverse=desc)
        self._result = (matched[0] if matched else None) if self._single else matched
        return self

    @property
    def data(self):
        return self._result


class FakeStorageBucket:
    def __init__(self, files: dict[str, bytes]):
        self._files = files
        self.removed: list[str] = []

    def download(self, path: str) -> bytes:
        if path not in self._files:
            raise FileNotFoundError(path)
        return self._files[path]

    def remove(self, paths: list[str]) -> None:
        for path in paths:
            self.removed.append(path)
            self._files.pop(path, None)


class FakeStorage:
    def __init__(self, files: dict[str, bytes]):
        self._files = files

    def from_(self, _bucket: str) -> FakeStorageBucket:
        return FakeStorageBucket(self._files)


class FakeAuth:
    def __init__(self, valid_tokens: dict[str, str]):
        self._valid_tokens = valid_tokens

    def get_user(self, token: str):
        user_id = self._valid_tokens.get(token)
        return SimpleNamespace(user=SimpleNamespace(id=user_id) if user_id else None)


class FakeAdminClient:
    def __init__(
        self,
        tables: dict[str, list[dict]] | None = None,
        files: dict[str, bytes] | None = None,
        valid_tokens: dict[str, str] | None = None,
    ):
        self._tables = tables if tables is not None else {}
        self.storage = FakeStorage(files if files is not None else {})
        self.auth = FakeAuth(valid_tokens if valid_tokens is not None else {})

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self._tables, name)
