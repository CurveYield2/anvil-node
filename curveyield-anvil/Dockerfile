FROM ghcr.io/foundry-rs/foundry:v1.5.1

USER root

COPY entrypoint.sh /usr/local/bin/curveyield-anvil-entrypoint
COPY healthcheck.sh /usr/local/bin/curveyield-anvil-healthcheck

RUN chmod 0755 /usr/local/bin/curveyield-anvil-entrypoint /usr/local/bin/curveyield-anvil-healthcheck \
    && mkdir -p /data

EXPOSE 8545

ENTRYPOINT ["/usr/local/bin/curveyield-anvil-entrypoint"]
