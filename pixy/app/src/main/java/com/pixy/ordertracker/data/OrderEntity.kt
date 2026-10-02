package com.pixy.ordertracker.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.pixy.ordertracker.models.Order
import com.pixy.ordertracker.models.OrderStatus

/** Row in the local orders table. Holds parsed fields only, never raw notification text. */
@Entity(tableName = "orders", indices = [Index("status"), Index("lastUpdatedAt")])
data class OrderEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sourceApp: String,
    val sourcePackage: String,
    val merchantName: String?,
    val orderTitle: String?,
    val status: String,
    val statusText: String,
    val etaMinutes: Int?,
    val etaCapturedAt: Long?,
    val estimatedDeliveryTime: Long?,
    val etaWindowStart: Long?,
    val riderName: String?,
    val notificationKey: String?,
    val createdAt: Long,
    val lastUpdatedAt: Long,
    val completedAt: Long?,
    val archived: Boolean,
    /** Denormalised for fast "active orders" queries. */
    val isActive: Boolean,
) {
    fun toModel() = Order(
        id, sourceApp, sourcePackage, merchantName, orderTitle, OrderStatus.fromName(status), statusText, etaMinutes, etaCapturedAt,
        estimatedDeliveryTime, etaWindowStart, riderName, notificationKey, createdAt, lastUpdatedAt, completedAt, archived,
    )

    companion object {
        fun from(o: Order) = OrderEntity(
            o.id, o.sourceApp, o.sourcePackage, o.merchantName, o.orderTitle, o.status.name, o.statusText, o.etaMinutes, o.etaCapturedAt,
            o.estimatedDeliveryTime, o.etaWindowStart, o.riderName, o.notificationKey, o.createdAt, o.lastUpdatedAt, o.completedAt, o.archived, o.isActive,
        )
    }
}
