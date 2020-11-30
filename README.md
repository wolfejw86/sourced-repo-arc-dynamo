# Sourced Repo Arc Dynamo

EventSourced entity repository pattern implementation - uses the following

@Architect - https://arc.codes

Uses Sourced for model / entity development
Sourced - https://github.com/mateodelnorte/sourced

Working implementation is based on the source-repo-mongo repository implementation for MongoDB - https://github.com/mateodelnorte/sourced-repo-mongo

## Why

Because building with event sourced models is easy and really robust.

## Todo

- [ ] implement full repo API as shown in `sourced-repo-mongo`
- [ ] document the API thoroughly
- [ ] provide alternate impl to not be dependent on Arc
- [ ] show example project of heavy pattern leveraging to make it obvious how to use this package
- [ ] finish test coverage
- [ ] add integration tests against dynamodb in a docker container
