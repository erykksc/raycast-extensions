# Fuzzy File Search Changelog

## [Improvements] - {PR_MERGE_DATE}

- Add noIgnore option to allow searching for all files with ignoring rules disabled
- Fix a bug where fd was still indexing in the background when the extension was closed during indexing

## [Rework] - 2025-10-05

- Use fzf CLI tool for fuzzy finding.
- Add automatic installation of the fzf CLI tool.
- Improve search performance.
- Add caching of indexed files
- Improve UI/UX with toast notifications.
- Fix issue where the heap memory limit is reached.

## [Initial version] - 2025-09-15
