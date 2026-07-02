from sqlalchemy import Column, Integer, String, Text

from .database import Base


# ORM model for application users.
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)


# ORM model for persistent source documents used in plagiarism tracing.
class SourceDocument(Base):
    __tablename__ = "source_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    source_type = Column(String, default="local", nullable=False)
    url = Column(String, nullable=True)
    content = Column(Text, nullable=False)
