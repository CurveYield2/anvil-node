# Qualified in GitHub Actions as Anvil 1.5.1-stable, commit b0a9dd9c.
FROM ghcr.io/foundry-rs/foundry:stable@sha256:043752653d5be351c71709091b3db97c4421c907eb40ea294195e7f532aadf46

USER root

COPY entrypoint.sh /usr/local/bin/curveyield-anvil-entrypoint
COPY healthcheck.sh /usr/local/bin/curveyield-anvil-healthcheck

RUN chmod 0755 /usr/local/bin/curveyield-anvil-entrypoint /usr/local/bin/curveyield-anvil-healthcheck \
    && mkdir -p /data

EXPOSE 8545

ENTRYPOINT ["/usr/local/bin/curveyield-anvil-entrypoint"]
