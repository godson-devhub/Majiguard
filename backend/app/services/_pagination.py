class InvalidPagination(ValueError):
    """Raised when a service pagination request is outside safe bounds."""


def validate_pagination(page: int, page_size: int, *, max_page_size: int = 500) -> None:
    if page < 1:
        raise InvalidPagination("page must be at least 1")
    if page_size < 1 or page_size > max_page_size:
        raise InvalidPagination(f"page_size must be between 1 and {max_page_size}")
