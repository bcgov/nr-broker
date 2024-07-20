const account = db.brokerAccount.findOne({ name: 'localhost' });
const user = db.user.findOne({});

db.jwtRegistryRepository.insertOne({
  accountId: account._id,
  claims: {
    client_id: process.env.JWT_CLIENT_ID,
    exp: process.env.JWT_EXP,
    jti: process.env.JWT_JTI,
    sub: process.env.JWT_SUB,
  },
  createdUserId: new ObjectId(user._id),
  createdAt: new Date(),
});
